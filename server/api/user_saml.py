# -*- coding: future_fstrings -*-
import uuid
from datetime import datetime
from urllib.parse import urlencode

from flask import Blueprint, current_app, request as current_request
from werkzeug.exceptions import InternalServerError

from server.api.base import json_endpoint, send_error_mail
from server.api.service_aups import has_agreed_with
from server.auth.mfa import mfa_idp_allowed, surf_secure_id_required, has_valid_mfa
from server.auth.security import confirm_read_access
from server.auth.user_claims import user_memberships
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE
from server.db.domain import User, Service, UserLogin
from server.logger.context_logger import ctx_logger

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")

USER_UNKNOWN = 1
USER_IS_SUSPENDED = 2
SERVICE_UNKNOWN = 3
SERVICE_NOT_CONNECTED = 4
COLLABORATION_NOT_ACTIVE = 5
MEMBERSHIP_NOT_ACTIVE = 6
AUP_NOT_AGREED = 99
SECOND_FA_REQUIRED = 100

# Independent mapping, so different attribute names can be send back
custom_saml_mapping = {
    "multi_value_attributes": ["edu_members", "affiliation", "scoped_affiliation", "entitlement"],
    "attribute_saml_mapping": {
        "uid": "cuid",
        "username": "uid"
    },
    "custom_attribute_saml_mapping": {
        "memberships": "eduPersonEntitlement",
    }
}


# See https://github.com/SURFscz/SBS/issues/152
def _perform_sram_login(uid, home_organisation_uid, schac_home_organisation, issuer_id, require_2fa=True):
    logger = ctx_logger("user_api")

    logger.debug("SBS login flow")

    user = User.query.filter(User.uid == uid).first()
    if not user:
        logger.debug("Creating new user in sram_login")
        user = User(uid=uid, created_by="system", updated_by="system")

    user.home_organisation_uid = home_organisation_uid
    user.schac_home_organisation = schac_home_organisation

    # TODO: lots of duplicated code below
    if require_2fa:
        idp_allowed = mfa_idp_allowed(user, schac_home_organisation, issuer_id)
        ssid_required = surf_secure_id_required(user, schac_home_organisation, issuer_id)
        fallback_required = not idp_allowed and not ssid_required and current_app.app_config.mfa_fallback_enabled

        # this is a configuration conflict and should never happen!
        if idp_allowed and ssid_required:
            raise InternalServerError("Both IdP-based MFA and SSID-based MFA configured "
                                      f"for IdP '{schac_home_organisation}'")

        # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
        # also skip if user has already recently performed MFA
        if not idp_allowed and (ssid_required or fallback_required) and not has_valid_mfa(user):
            base_url = current_app.app_config.base_url
            if ssid_required:
                user.ssid_required = True
                user.home_organisation_uid = home_organisation_uid
                user.schac_home_organisation = schac_home_organisation
                redirect_base_url = f"{base_url}/api/mfa/ssid_start"
            else:
                redirect_base_url = f"{base_url}/2fa"

            user.second_fa_uuid = str(uuid.uuid4())
            user = db.session.merge(user)
            db.session.commit()

            logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa "
                         f"(ssid={ssid_required})")

            return {
                       "status": {
                           "result": "interrupt",
                           "redirect_url": f"{redirect_base_url}/{user.second_fa_uuid}",
                           "error_status": SECOND_FA_REQUIRED
                       }
                   }, 200

    db.session.merge(user)
    db.session.commit()
    return {"status": {"result": "authorized"}}, 200


def _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func,
                   home_organisation_uid=None, schac_home_organisation=None, require_2fa=False, issuer_id=None):
    confirm_read_access()
    logger = ctx_logger("user_api")

    service = Service.query.filter(Service.entity_id == service_entity_id).first()
    if not service:
        msg = f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} " \
              f"as the service is unknown"
        logger.error(msg)
        send_error_mail(tb=msg, session_exists=False)
        return not_authorized_func(service_entity_id, SERVICE_UNKNOWN)
    no_free_ride = not service.non_member_users_access_allowed
    user = User.query.filter(User.uid == uid).first()
    if not user:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the user is unknown")
        return not_authorized_func(service.name, USER_UNKNOWN)
    if user.suspended and no_free_ride:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the user is suspended")
        return not_authorized_func(service.name, USER_IS_SUSPENDED)

    connected_collaborations = []
    memberships = []
    for cm in user.collaboration_memberships:
        connected = list(filter(lambda s: s.id == service.id, cm.collaboration.services))
        if connected or list(filter(lambda s: s.id == service.id, cm.collaboration.organisation.services)):
            connected_collaborations.append(cm.collaboration)
            memberships.append(cm)

    if not connected_collaborations and no_free_ride:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any of the user collaborations")
        return not_authorized_func(service.name, SERVICE_NOT_CONNECTED)

    if all(coll.status != STATUS_ACTIVE for coll in connected_collaborations) and no_free_ride:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any active collaborations")
        return not_authorized_func(service.name, COLLABORATION_NOT_ACTIVE)

    if all(m.is_expired() for m in memberships) and no_free_ride:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as none of the collaboration memberships are active")
        return not_authorized_func(service.name, MEMBERSHIP_NOT_ACTIVE)

    # logic should be: first check what type of 2FA the user should use (IdP, SSID, MFA)
    # if idp:  then always continue (everything is assumed to be handled by IdP)
    # if ssid or mfa: check if user has recently done check; if so, than continue
    #                 otherwise, send interrupt

    # Leave the 2FA and AUP checks as the last checks as these are the only exceptions that can be recovered from
    if require_2fa:
        idp_allowed = mfa_idp_allowed(user, schac_home_organisation, issuer_id)
        ssid_required = surf_secure_id_required(user, schac_home_organisation, issuer_id)
        fallback_required = not idp_allowed and not ssid_required and current_app.app_config.mfa_fallback_enabled

        # this is a configuration conflict and should never happen!
        if idp_allowed and ssid_required:
            raise InternalServerError(
                f"Both IdP-based MFA and SSID-based MFA configured for IdP '{schac_home_organisation}'")

        # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
        # also skip if user has already recently performed MFA
        if not idp_allowed and (ssid_required or fallback_required) and not has_valid_mfa(user):
            if ssid_required:
                user.ssid_required = True
                user.home_organisation_uid = home_organisation_uid
                user.schac_home_organisation = schac_home_organisation
                user = db.session.merge(user)
                db.session.commit()

            logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa "
                         f"(ssid={ssid_required})")
            return not_authorized_func(user, SECOND_FA_REQUIRED)

    if not has_agreed_with(user, service):
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept AUP")
        return not_authorized_func(service, AUP_NOT_AGREED)

    now = datetime.now()
    for coll in connected_collaborations:
        coll.last_activity_date = now
        db.session.merge(coll)

    user.last_accessed_date = now
    user.last_login_date = now
    user.suspend_notifications = []

    user = db.session.merge(user)

    all_memberships = user_memberships(user, connected_collaborations)
    all_attributes, http_status = authorized_func(user, all_memberships)

    # Keep track of user logins for audit / statistics reasons
    user_login = UserLogin(service_id=service.id, user_id=user.id)
    db.session.merge(user_login)
    db.session.commit()

    logger.info(f"Returning attributes {all_attributes} for user {uid} and service_entity_id {service_entity_id}")

    return all_attributes, http_status


# Endpoint for EDUteams
@user_saml_api.route("/proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz():
    json_dict = current_request.get_json()
    uid = json_dict["user_id"]
    service_entity_id = json_dict["service_id"]
    issuer_id = json_dict["issuer_id"]
    # These are optional; they are only used to check for logins that should do SSID-SFO
    # If the proxy doesn't send these, we can safely assume the user shouldn't be sent to SSID
    home_organisation_uid = json_dict.get("uid", "[[UNKNOWN]]")
    schac_home_organisation = json_dict.get("homeorganization", "[[UNKNOWN]]")

    logger = ctx_logger("user_api")
    logger.debug(f"proxy_authz called with {str(json_dict)}")

    if service_entity_id.lower() == current_app.app_config.oidc.sram_service_entity_id.lower():
        return _perform_sram_login(uid, home_organisation_uid, schac_home_organisation, issuer_id)

    def not_authorized_func(service_name, status):
        base_url = current_app.app_config.base_url
        if status == SECOND_FA_REQUIRED:
            # Internal contract, in case of SECOND_FA_REQUIRED we get the User instance returned
            user = service_name
            user.second_factor_confirmed = False
            user.second_fa_uuid = str(uuid.uuid4())
            db.session.merge(user)
            db.session.commit()
            if user.ssid_required:
                redirect_url = f"{base_url}/api/mfa/ssid_start/{user.second_fa_uuid}"
            else:
                redirect_url = f"{base_url}/2fa/{user.second_fa_uuid}"
            result = "interrupt"
        elif status == AUP_NOT_AGREED:
            # Internal contract, in case of AUP_NOT_AGREED we get the Service instance returned
            parameters = urlencode({"service_id": service_name.uuid4, "service_name": service_name.name})
            redirect_url = f"{base_url}/service-aup?{parameters}"
            result = "interrupt"
        else:
            parameters = urlencode({"service_name": service_name, "error_status": status})
            redirect_url = f"{base_url}/service-denied?{parameters}"
            result = "unauthorized"
        return {
                   "status": {
                       "result": result,
                       "redirect_url": redirect_url,
                       "error_status": status
                   }
               }, 200

    def authorized_func(user, memberships):
        eppn_scope = current_app.app_config.eppn_scope.strip()
        user.home_organisation_uid = home_organisation_uid
        user.schac_home_organisation = schac_home_organisation
        db.session.merge(user)
        return {
                   "status": {
                       "result": "authorized",
                   },
                   "attributes": {
                       "eduPersonEntitlement": list(memberships),
                       "eduPersonPrincipalName": [f"{user.username}@{eppn_scope}"],
                       "uid": [user.username],
                       "sshkey": [ssh_key.ssh_value for ssh_key in user.ssh_keys]
                   }
               }, 200

    return _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func,
                          schac_home_organisation=schac_home_organisation, home_organisation_uid=home_organisation_uid,
                          require_2fa=True, issuer_id=issuer_id)
