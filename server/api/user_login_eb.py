import urllib.parse
import uuid

from flask import Blueprint, current_app, request as current_request, redirect, session
from werkzeug.exceptions import Forbidden

from server import tools
from server.api.base import json_endpoint, send_error_mail, query_param
from server.api.service_aups import has_agreed_with
from server.auth.mfa import user_requires_sram_mfa, store_user_in_session
from server.auth.service_access import has_user_access_to_service, collaboration_memberships_for_service
from server.auth.user_claims import user_memberships, co_tags
from server.auth.user_codes import UserCode
from server.db.db import db
from server.db.defaults import PROXY_AUTHZ
from server.db.domain import User, Service, UserNonce
from server.db.models import log_user_login
from server.logger.context_logger import ctx_logger

user_login_eb = Blueprint("user_login_eb", __name__, url_prefix="/api/users")


# Endpoint for EB
@user_login_eb.route("/authz_eb", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz_eb():
    authorization_header = current_request.headers.get("Authorization")
    eb_api_token = current_app.app_config.engine_block.api_token
    if eb_api_token != authorization_header:
        raise Forbidden("Invalid authorization_header")

    json_dict = current_request.get_json()
    uid = json_dict["user_id"]
    service_entity_id = json_dict["service_id"].lower()
    issuer_id = json_dict["issuer_id"]
    continue_url = json_dict["continue_url"]

    logger = ctx_logger("user_login_eb")
    logger.debug(f"authz_eb called with {json_dict}")

    # user who log in to SBS itself can continue here; their attributes are checked in user.py/resume_session()
    if service_entity_id == current_app.app_config.oidc.sram_service_entity_id.lower():
        logger.debug(f"Return authorized to start SBS login flow, service_entity_id={service_entity_id}")
        return {"msg": "authorized"}, 200

    service = Service.query.filter(Service.entity_id == service_entity_id).first()
    user = User.query.filter(User.uid == uid).first()

    nonce = str(uuid.uuid4())
    user_nonce = UserNonce(user=user, service=service, nonce=nonce, continue_url=continue_url, issuer_id=issuer_id,
                           requested_service_entity_id=service_entity_id)
    # Unknown service returns unauthorized
    if not service:
        msg = f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} " \
              f"as the service is unknown"
        logger.error(msg)
        send_error_mail(tb=msg)
        user_nonce.error_status = UserCode.SERVICE_UNKNOWN.value
        results = {
            "msg": "interrupt",
            "nonce": nonce,
            "message": UserCode.SERVICE_UNKNOWN
        }
    elif not user:
        free_rider = service.non_member_users_access_allowed
        if free_rider:
            return {
                "msg": "authorized",
                "attributes": {}
            }, 200
        else:
            user_nonce.error_status = UserCode.USER_UNKNOWN.value
            results = {
                "msg": "interrupt",
                "nonce": nonce,
                "message": UserCode.USER_UNKNOWN.name
            }
    elif user.suspended:
        user_nonce.error_status = UserCode.USER_IS_SUSPENDED.value
        results = {
            "msg": "interrupt",
            "nonce": nonce,
            "message": UserCode.USER_IS_SUSPENDED.name
        }
    # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
    # also skip if user has already recently performed MFA
    elif user_requires_sram_mfa(user, issuer_id):
        logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa")
        user_nonce.error_status = UserCode.SECOND_FA_REQUIRED.value
        results = {
            "msg": "interrupt",
            "nonce": nonce,
            "message": UserCode.SECOND_FA_REQUIRED.name
        }

    # if none of CO's are not active, then this is the same as none of the CO's are not connected to the Service
    elif not has_user_access_to_service(service, user):
        logger.debug(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} "
                     "because the service is not connected to any active CO's")
        user_nonce.error_status = UserCode.SERVICE_NOT_CONNECTED.value
        results = {
            "msg": "unauthorized",
            "nonce": nonce,
            "message": UserCode.SERVICE_NOT_CONNECTED.name
        }
    elif not has_agreed_with(user, service):
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept "
                     f"Service AUP")
        user_nonce.error_status = UserCode.SERVICE_AUP_NOT_AGREED.value
        results = {
            "msg": "interrupt",
            "nonce": nonce,
            "message": UserCode.SERVICE_AUP_NOT_AGREED.name
        }
    elif not user.has_agreed_with_aup():
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept"
                     f"SRAM general AUP")
        user_nonce.error_status = UserCode.AUP_NOT_AGREED.value
        results = {
            "msg": "interrupt",
            "nonce": nonce,
            "message": UserCode.AUP_NOT_AGREED.name
        }
    else:
        # All is well, we collect all memberships and return authorized
        user.successful_login()
        user = db.session.merge(user)
        memberships = collaboration_memberships_for_service(service, user)
        connected_collaborations = [cm.collaboration for cm in memberships]
        for coll in connected_collaborations:
            coll.last_activity_date = tools.dt_now()
            db.session.merge(coll)
        all_memberships = user_memberships(user, connected_collaborations)
        all_tags = co_tags(connected_collaborations)
        all_attributes = all_memberships.union(all_tags)

        log_user_login(PROXY_AUTHZ, True, user, uid, service, service_entity_id, "AUTHORIZED")

        return {
            "msg": "authorized",
            "attributes": {
                "eduPersonEntitlement": list(all_attributes),
                "voPersonID": user.uid,
                "sshPublicKey": [ssh_key.ssh_value for ssh_key in user.ssh_keys]
            }
        }, 200
    # Once we got here, we need to store the UserNonce
    db.session.merge(user_nonce)
    db.session.commit()
    return results, 200


@user_login_eb.route("/interrupt", methods=["GET"], strict_slashes=False)
def interrupt():
    nonce = query_param("nonce")
    user_nonce = UserNonce.query.filter(UserNonce.nonce == nonce).one()
    user = user_nonce.user
    if user:
        # Put the user in the session if there is none or a different user, and pass control back to the GUI
        user_from_session = session.get("user", {})
        if user_from_session.get("guest", True) or not user.id == user_from_session.get("id"):
            user_accepted_aup = user.has_agreed_with_aup()
            store_user_in_session(user, False, user_accepted_aup)
    continue_url = user_nonce.continue_url
    # The original destination is returned from both 2mfa endpoint and agree_aup endpoint
    session["original_destination"] = continue_url
    service = user_nonce.service
    # Add the parameters, which are used in some interrupt flows
    parameters = {
        "service_name": service.name if service else user_nonce.requested_service_entity_id,
        "service_id": service.uuid4 if service else None,
        "continue_url": user_nonce.continue_url,
        "entity_id": service.entity_id if service else user_nonce.requested_service_entity_id,
        "issuer_id": user_nonce.issuer_id,
        "user_id": user.uid if user else None,
        "error_status": user_nonce.error_status
    }
    # Now delete the user_nonce
    db.session.delete(user_nonce)
    db.session.commit()

    client_base_url = current_app.app_config.base_url
    args = urllib.parse.urlencode(parameters)
    return redirect(f"{client_base_url}/interrupt?{args}")
