# -*- coding: future_fstrings -*-
import uuid
from datetime import datetime
from urllib.parse import urlencode

from flask import Blueprint, current_app, request as current_request

from server.api.base import json_endpoint, query_param, send_error_mail
from server.api.service_aups import has_agreed_with
from server.auth.mfa import mfa_idp_allowed
from server.auth.security import confirm_read_access
from server.auth.user_claims import user_memberships
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE
from server.db.domain import User, Service
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


def _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func, require_2fa=False, issuer_id=None):
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

    # Leave the 2FAand AUP checks as the last checks as these are the only exceptions that can be recovered from
    if require_2fa:
        idp_allowed = mfa_idp_allowed(user, user.schac_home_organisation, issuer_id)
        if not idp_allowed:
            logger.debug(f"Returning interrupt for user {uid} from issuer {issuer_id} to perform 2fa")
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
    db.session.commit()

    all_memberships = user_memberships(user, connected_collaborations)
    all_attributes, http_status = authorized_func(user, all_memberships)

    logger.info(f"Returning attributes {all_attributes} for user {uid} and service_entity_id {service_entity_id}")

    return all_attributes, http_status


# Endpoint for SATOSA/eduteams
@user_saml_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")

    def not_authorized_func(_, status):
        if status == USER_UNKNOWN:
            return {"error": f"user {uid} is unknown"}, 404
        elif status == USER_IS_SUSPENDED:
            return {"error": f"user {uid} is suspended"}, 404
        elif status == SERVICE_UNKNOWN or status == SERVICE_NOT_CONNECTED or status == COLLABORATION_NOT_ACTIVE:
            return {}, 200
        elif status == AUP_NOT_AGREED:
            return {"error": f"user {uid} has not agreed to the aup of {service_entity_id}"}, 403

    def authorized_func(user, memberships):
        # gather regular user attributes
        result = {}
        for k, v in custom_saml_mapping["attribute_saml_mapping"].items():
            val = getattr(user, k)
            if val:
                result[v] = val.split(",") if k in custom_saml_mapping["multi_value_attributes"] else [val]
        result["sshKey"] = [ssh_key.ssh_value for ssh_key in user.ssh_keys]
        membership_attribute = custom_saml_mapping['custom_attribute_saml_mapping']['memberships']
        result[membership_attribute] = memberships

        result = {k: list(set(v)) for k, v in result.items()}
        return result, 200

    return _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func)


# Endpoint for EDUteams
@user_saml_api.route("/proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def proxy_authz():
    json_dict = current_request.get_json()
    uid = json_dict["user_id"]
    service_entity_id = json_dict["service_id"]
    issuer_id = json_dict["issuer_id"]

    def not_authorized_func(service_name, status):
        base_url = current_app.app_config.base_url
        if status == SECOND_FA_REQUIRED:
            # Internal contract, in case of SECOND_FA_REQUIRED we get the User instance returned
            user = service_name
            user.second_fa_uuid = str(uuid.uuid4())
            db.session.merge(user)
            db.session.commit()
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
                          require_2fa=True,
                          issuer_id=issuer_id)
