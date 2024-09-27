import urllib.parse
import uuid
from urllib.parse import urlencode

from flask import Blueprint, current_app, request as current_request

from server import tools
from server.api.base import json_endpoint, send_error_mail
from server.api.service_aups import has_agreed_with
from server.auth.mfa import mfa_idp_allowed, has_valid_mfa
from server.auth.security import confirm_read_access
from server.auth.service_access import has_user_access_to_service
from server.auth.user_claims import user_memberships, collaboration_memberships_for_service, co_tags, \
    valid_user_attributes
from server.auth.user_codes import USER_UNKNOWN, USER_IS_SUSPENDED, SERVICE_UNKNOWN, SERVICE_NOT_CONNECTED, \
    COLLABORATION_NOT_ACTIVE, NEW_FREE_RIDE_USER, MISSING_ATTRIBUTES, AUP_NOT_AGREED, SECOND_FA_REQUIRED, \
    status_to_string
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, PROXY_AUTHZ
from server.db.domain import User, Service
from server.db.models import log_user_login
from server.logger.context_logger import ctx_logger

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")


def _do_attributes(user, uid, service, service_entity_id, not_authorized_func, authorized_func,
                   home_organisation_uid=None, schac_home_organisation=None, require_2fa=False, issuer_id=None):
    confirm_read_access()
    logger = ctx_logger("user_api")

    if not service:
        msg = f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} " \
              f"as the service is unknown"
        logger.error(msg)
        send_error_mail(tb=msg)
        return not_authorized_func(service_entity_id, SERVICE_UNKNOWN)
    free_ride = service.non_member_users_access_allowed
    if user is None:
        if free_ride:
            logger.debug(
                f"Returning interrupt for new user {uid} and service_entity_id {service_entity_id} to provision user")
            return not_authorized_func(service, NEW_FREE_RIDE_USER)
        else:
            logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                         f" as the user is unknown")
            return not_authorized_func(service.name, USER_UNKNOWN)

    if user.suspended and not free_ride:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the user is suspended")
        return not_authorized_func(service.name, USER_IS_SUSPENDED)

    memberships = collaboration_memberships_for_service(user, service)
    connected_collaborations = [cm.collaboration for cm in memberships]
    crm_organisation_allowed = service.access_allowed_by_crm_organisation(user)

    if not connected_collaborations and not free_ride and not crm_organisation_allowed:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any of the user's collaborations")
        return not_authorized_func(service.name, SERVICE_NOT_CONNECTED)

    no_active_co = all(coll.status != STATUS_ACTIVE for coll in connected_collaborations)
    if no_active_co and not free_ride and not crm_organisation_allowed:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any active collaborations")
        return not_authorized_func(service.name, COLLABORATION_NOT_ACTIVE)

    # logic should be: first check what type of 2FA the user should use (IdP, SSID, MFA)
    # if idp:  then always continue (everything is assumed to be handled by IdP)
    # if ssid or mfa: check if user has recently done check; if so, than continue
    #                 otherwise, send interrupt

    # Leave the 2FA and AUP checks as the last checks as these are the only exceptions that can be recovered from
    if require_2fa:
        idp_allowed = mfa_idp_allowed(schac_home_organisation, issuer_id)
        fallback_required = not idp_allowed and current_app.app_config.mfa_fallback_enabled

        # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
        # also skip if user has already recently performed MFA
        if not idp_allowed and fallback_required and not has_valid_mfa(user):
            logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa")
            return not_authorized_func(user, SECOND_FA_REQUIRED)

    if not has_agreed_with(user, service):
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept AUP")
        return not_authorized_func(service, AUP_NOT_AGREED)

    now = tools.dt_now()
    for coll in connected_collaborations:
        coll.last_activity_date = now
        db.session.merge(coll)

    user.last_accessed_date = now
    user.last_login_date = now
    user.suspended = False
    user.suspend_notifications = []

    user = db.session.merge(user)

    all_memberships = user_memberships(user, connected_collaborations)
    all_tags = co_tags(connected_collaborations)
    all_attributes, http_status = authorized_func(user, all_memberships | all_tags)

    logger.info(f"Returning attributes {all_attributes} for user {uid} and service_entity_id {service_entity_id}")

    return all_attributes, http_status


# Endpoint for eduTEAMS
@user_saml_api.route("/proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz():
    json_dict = current_request.get_json()
    uid = json_dict["user_id"]
    service_entity_id = json_dict["service_id"].lower()
    issuer_id = json_dict["issuer_id"]
    # Client URL for direct error message
    base_url = current_app.app_config.base_url
    # New interrupt endpoint server-side to decide where to go next
    base_server_url = current_app.app_config.base_server_url

    logger = ctx_logger("user_api")
    logger.debug(f"proxy_authz called with {json_dict}")

    # user who log in to SBS itself can continue here; their attributes are checked in user.py/resume_session()
    if service_entity_id == current_app.app_config.oidc.sram_service_entity_id.lower():
        logger.debug("Return authorized to start SBS login flow")
        return {"status": {"result": "authorized"}}, 200

    parameters = {"service_name": service_entity_id, "entity_id": service_entity_id, "issuer_id": issuer_id,
                  "user_id": uid}

    service = Service.query.filter(Service.entity_id == service_entity_id).first()
    # Unknown service returns unauthorized
    if not service:
        msg = f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} " \
              f"as the service is unknown"
        logger.error(msg)
        send_error_mail(tb=msg)
        parameters["error_status"] = SERVICE_UNKNOWN
        return {
            "status": {
                "result": "unauthorized",
                "redirect_url": f"{base_url}/service-denied?{urlencode(parameters)}",
                "error_status": SERVICE_UNKNOWN
            }
        }, 200
    # Add the uuid4 and name of the service, which is used in some interrupt flows
    parameters["service_id"]= service.uuid4
    parameters["service_name"]= service.name
    user = User.query.filter(User.uid == uid).first()
    if not user:
        parameters["error_status"] = USER_UNKNOWN
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(parameters)}",
                "error_status": USER_UNKNOWN
            }
        }, 200

    if user.suspended:
        parameters["error_status"] = USER_IS_SUSPENDED
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(parameters)}",
                "error_status": USER_IS_SUSPENDED
            }
        }, 200

    idp_mfa_allowed = mfa_idp_allowed(user, issuer_id)
    fallback_required = not idp_mfa_allowed and current_app.app_config.mfa_fallback_enabled
    # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
    # also skip if user has already recently performed MFA
    if not idp_mfa_allowed and fallback_required and not has_valid_mfa(user):
        logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa")
        user.second_factor_confirmed = False
        user.second_fa_uuid = str(uuid.uuid4())
        db.session.merge(user)
        db.session.commit()
        # Do not leak second_da_uuid if not necessary
        new_parameters = {**parameters, "error_status": SECOND_FA_REQUIRED,"second_fa_uuid": user.second_fa_uuid}
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(new_parameters)}",
                "error_status": SECOND_FA_REQUIRED
            }
        }, 200
    # if CO's are not active, then this is the same as the CO is not connected to the Service
    if not has_user_access_to_service(service, user):
        logger.debug(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} "
                     "because the service is not connected to any active CO's")
        parameters["error_status"] = SERVICE_NOT_CONNECTED
        return {
            "status": {
                "result": "unauthorized",
                "redirect_url": f"{base_url}/service-denied?{urlencode(parameters)}",
                "error_status": SERVICE_NOT_CONNECTED
            }
        }, 200

    if not has_agreed_with(user, service):
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept AUP")
        parameters["error_status"] = AUP_NOT_AGREED
        return {
            "status": {
                "result": "unauthorized",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(parameters)}",
                "error_status": AUP_NOT_AGREED
            }
        }, 200

    # users who log in to services should have a complete set of attributes (because they have logged in to SBS
    # itself before),
    # but users who are not provisioned at all are caught below (with an AUP_NOT_AGREED interrupt)
    if user is not None and not valid_user_attributes({"sub": user.uid, "name": user.name, "email": user.email}):
        args = urllib.parse.urlencode({"aud": service_entity_id,
                                       "iss": issuer_id,
                                       "sub": user.uid})
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{current_app.app_config.base_url}/missing-attributes?{args}",
                "error_status": MISSING_ATTRIBUTES
            }
        }, 200

    def not_authorized_func(service_name, status):
        base_url = current_app.app_config.base_url
        base_server_url = current_app.app_config.base_server_url
        if status == SECOND_FA_REQUIRED:
            # Internal contract, in case of SECOND_FA_REQUIRED we get the User instance returned
            user_not_authorized = service_name
            user_not_authorized.second_factor_confirmed = False
            user_not_authorized.second_fa_uuid = str(uuid.uuid4())
            db.session.merge(user_not_authorized)
            db.session.commit()
            if user_not_authorized.ssid_required:
                redirect_url = f"{base_server_url}/api/mfa/ssid_start/{user_not_authorized.second_fa_uuid}"
            else:
                redirect_url = f"{base_url}/2fa/{user_not_authorized.second_fa_uuid}"
            result = "interrupt"
        elif status == AUP_NOT_AGREED or status == NEW_FREE_RIDE_USER:
            # Internal contract, in case of AUP_NOT_AGREED we get the Service instance returned
            parameters = urlencode({
                "service_id": service_name.uuid4,
                "service_name": service_name.name,
                "status": status
            })
            pathname = "delay" if status == NEW_FREE_RIDE_USER else "service-aup"
            redirect_url = f"{base_url}/{pathname}?{parameters}"
            result = "interrupt"
        else:
            parameters = urlencode({"service_name": service_name, "error_status": status,
                                    "entity_id": service_entity_id, "issuer_id": issuer_id,
                                    "user_id": uid})
            redirect_url = f"{base_url}/service-denied?{parameters}"
            result = "unauthorized"

        log_user_login(PROXY_AUTHZ, False, user, uid, service, service_entity_id, status=status_to_string(status))

        return {
            "status": {
                "result": result,
                "redirect_url": redirect_url,
                "error_status": status
            }
        }, 200

    def authorized_func(authorized_user, memberships):
        eppn_scope = current_app.app_config.eppn_scope.strip()
        if home_organisation_uid:
            authorized_user.home_organisation_uid = home_organisation_uid
        if schac_home_organisation and not authorized_user.schac_home_organisation:
            authorized_user.schac_home_organisation = schac_home_organisation
        db.session.merge(authorized_user)
        db.session.commit()

        log_user_login(PROXY_AUTHZ, True, user, uid, service, service_entity_id, "AUTHORIZED")

        return {
            "status": {
                "result": "authorized",
            },
            "attributes": {
                "eduPersonEntitlement": list(memberships),
                "eduPersonPrincipalName": [f"{authorized_user.username}@{eppn_scope}"],
                "uid": [authorized_user.username],
                "sshkey": [ssh_key.ssh_value for ssh_key in authorized_user.ssh_keys]
            }
        }, 200

    return _do_attributes(user, uid, service, service_entity_id, not_authorized_func, authorized_func,
                          schac_home_organisation=schac_home_organisation, home_organisation_uid=home_organisation_uid,
                          require_2fa=True, issuer_id=issuer_id)
