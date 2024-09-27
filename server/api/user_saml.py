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
        # Do not expose second_fa_uuid if not necessary
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
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept "
                     f"Service AUP")
        parameters["error_status"] = AUP_NOT_AGREED
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(parameters)}",
                "error_status": AUP_NOT_AGREED
            }
        }, 200

    if not user.has_agreed_with_aup():
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept"
                     f"SRAM general AUP")
        parameters["error_status"] = AUP_NOT_AGREED
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{base_server_url}/interrupt?{urlencode(parameters)}",
                "error_status": AUP_NOT_AGREED
            }
        }, 200

    now = tools.dt_now()

    memberships = collaboration_memberships_for_service(user, service)
    connected_collaborations = [cm.collaboration for cm in memberships]

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

    eppn_scope = current_app.app_config.eppn_scope.strip()

    log_user_login(PROXY_AUTHZ, True, user, uid, service, service_entity_id, "AUTHORIZED")

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

