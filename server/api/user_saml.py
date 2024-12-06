import base64
from urllib.parse import urlencode

from flask import Blueprint, current_app, request as current_request, redirect, session
from lxml import etree
from signxml import XMLVerifier

from server import tools
from server.api.base import json_endpoint, send_error_mail, query_param
from server.api.service_aups import has_agreed_with
from server.auth.mfa import user_requires_sram_mfa, store_user_in_session
from server.auth.service_access import has_user_access_to_service, collaboration_memberships_for_service
from server.auth.surf_conext import surf_public_signing_certificate
from server.auth.user_claims import user_memberships, co_tags
from server.auth.user_codes import UserCode
from server.db.db import db
from server.db.defaults import PROXY_AUTHZ
from server.db.domain import User, Service
from server.db.models import log_user_login
from server.logger.context_logger import ctx_logger

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")


# Endpoint for eduTEAMS
@user_saml_api.route("/proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz_edu_teams():
    return do_authz_proxy(True)


# Endpoint for EB
@user_saml_api.route("/proxy_authz_eb", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz_eb():
    return do_authz_proxy(False)


def do_authz_proxy(is_edu_teams: bool):
    json_dict = current_request.get_json()
    uid = json_dict["user_id"]
    service_entity_id = json_dict["service_id"].lower()
    issuer_id = json_dict["issuer_id"]
    # Client URL for direct error message in case of unauthorized and interrupt endpoint to decide what to do
    client_base_url = current_app.app_config.base_url
    base_server_url = current_app.app_config.base_server_url
    # Redirect from eduTeams needs to land on GUI, but redirect from EB needs to land on server
    interrupt_url = f"{client_base_url}/interrupt" if is_edu_teams else f"{base_server_url}/api/users/interrupt"
    logger = ctx_logger("user_api")
    logger.debug(f"proxy_authz called with {json_dict}")
    # user who log in to SBS itself can continue here; their attributes are checked in user.py/resume_session()
    if service_entity_id == current_app.app_config.oidc.sram_service_entity_id.lower():
        logger.debug(f"Return authorized to start SBS login flow, service_entity_id={service_entity_id}")
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
        parameters["error_status"] = UserCode.SERVICE_UNKNOWN.value
        return {
            "status": {
                "result": "unauthorized",
                "redirect_url": f"{client_base_url}/service-denied?{urlencode(parameters)}",
                "error_status": UserCode.SERVICE_UNKNOWN.value,
                "info": UserCode.SERVICE_UNKNOWN.name
            }
        }, 200
    # Add the uuid4 and name of the service, which is used in some interrupt flows
    parameters["service_id"] = service.uuid4
    parameters["service_name"] = service.name
    user = User.query.filter(User.uid == uid).first()
    if not user:
        free_rider = service.non_member_users_access_allowed
        if not is_edu_teams:
            if free_rider:
                return {
                    "status": {
                        "result": "authorized",
                    },
                    "attributes": {}
                }, 200
            else:
                parameters["error_status"] = UserCode.USER_UNKNOWN.value
                return {
                    "status": {
                        "result": "unauthorized",
                        "redirect_url": f"{client_base_url}/service-denied?{urlencode(parameters)}",
                        "error_status": UserCode.USER_UNKNOWN.value,
                        "info": UserCode.USER_UNKNOWN.name
                    }
                }, 200
        user_code = UserCode.NEW_FREE_RIDE_USER if free_rider else UserCode.USER_UNKNOWN
        parameters["error_status"] = user_code.value
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{interrupt_url}?{urlencode(parameters)}",
                "error_status": user_code.value,
                "info": user_code.name
            }
        }, 200
    if user.suspended:
        parameters["error_status"] = UserCode.USER_IS_SUSPENDED.value
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{interrupt_url}?{urlencode(parameters)}",
                "error_status": UserCode.USER_IS_SUSPENDED.value,
                "info": UserCode.USER_IS_SUSPENDED.name
            }
        }, 200

    # if IdP-base MFA is set, we assume everything is handled by the IdP, and we skip all checks here
    # also skip if user has already recently performed MFA
    if user_requires_sram_mfa(user, issuer_id):
        logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa")
        new_parameters = {**parameters,
                          "error_status": UserCode.SECOND_FA_REQUIRED.value}
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{interrupt_url}?{urlencode(new_parameters)}",
                "error_status": UserCode.SECOND_FA_REQUIRED.value,
                "info": UserCode.SECOND_FA_REQUIRED.name
            }
        }, 200

    # if none of CO's are not active, then this is the same as none of the CO's are not connected to the Service
    if not has_user_access_to_service(service, user):
        logger.debug(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} "
                     "because the service is not connected to any active CO's")
        parameters["error_status"] = UserCode.SERVICE_NOT_CONNECTED.value
        return {
            "status": {
                "result": "unauthorized",
                "redirect_url": f"{client_base_url}/service-denied?{urlencode(parameters)}",
                "error_status": UserCode.SERVICE_NOT_CONNECTED.value,
                "info": UserCode.SERVICE_NOT_CONNECTED.name
            }
        }, 200

    if not has_agreed_with(user, service):
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept "
                     f"Service AUP")
        parameters["error_status"] = UserCode.SERVICE_AUP_NOT_AGREED.value
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{interrupt_url}?{urlencode(parameters)}",
                "error_status": UserCode.SERVICE_AUP_NOT_AGREED.value,
                "info": UserCode.SERVICE_AUP_NOT_AGREED.name
            }
        }, 200
    if not user.has_agreed_with_aup():
        logger.debug(f"Returning interrupt for user {uid} and service_entity_id {service_entity_id} to accept"
                     f"SRAM general AUP")
        parameters["error_status"] = UserCode.AUP_NOT_AGREED.value
        return {
            "status": {
                "result": "interrupt",
                "redirect_url": f"{interrupt_url}?{urlencode(parameters)}",
                "error_status": UserCode.AUP_NOT_AGREED.value,
                "info": UserCode.AUP_NOT_AGREED.name
            }
        }, 200
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
        "status": {
            "result": "authorized",
        },
        "attributes": {
            "eduPersonEntitlement": list(all_attributes),
            "eduPersonPrincipalName": [f"{user.username}@{current_app.app_config.eppn_scope.strip()}"],
            "uid": [user.username],
            "sshkey": [ssh_key.ssh_value for ssh_key in user.ssh_keys]
        }
    }, 200


@user_saml_api.route("/interrupt", methods=["POST"], strict_slashes=False)
def interrupt():
    base64_encoded_xml = current_request.form.get("signed_user")
    xml = base64.b64decode(base64_encoded_xml).decode()
    doc = etree.fromstring(xml)
    cert = surf_public_signing_certificate(current_app)
    verified_data = XMLVerifier().verify(doc, x509_cert=cert).signed_xml
    user_uid = verified_data.attrib.get("user_id")
    user = User.query.filter(User.uid == user_uid).one()

    user_accepted_aup = user.has_agreed_with_aup()
    # Put the user in the session, and pass control back to the GUI
    store_user_in_session(user, False, user_accepted_aup)
    continue_url = current_request.form.get("continue_url")
    # The original destination is returned from both 2mfa endpoint and agree_aup endpoint
    session["original_destination"] = continue_url
    client_base_url = current_app.app_config.base_url
    error_status = query_param("error_status")
    return redirect(f"{client_base_url}/interrupt?error_status{error_status}=&continue_url={continue_url}")
