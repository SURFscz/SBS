# -*- coding: future_fstrings -*-

from datetime import datetime
from urllib.parse import urlencode

from flask import Blueprint, current_app, request as current_request

from server.api.base import json_endpoint, query_param, send_error_mail
from server.auth.security import confirm_read_access
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


def _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func):
    confirm_read_access()
    logger = ctx_logger("user_api")

    service = Service.query.filter(Service.entity_id == service_entity_id).first()
    if not service:
        msg = f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id} " \
              f"as the service is unknown"
        logger.error(msg)
        send_error_mail(tb=msg, session_exists=False)
        return not_authorized_func(service_entity_id, SERVICE_UNKNOWN)

    user = User.query.filter(User.uid == uid).first()
    if not user:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the user is unknown")
        return not_authorized_func(service.name, USER_UNKNOWN)
    if user.suspended:
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

    if not connected_collaborations:
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any of the user collaborations")
        return not_authorized_func(service.name, SERVICE_NOT_CONNECTED)

    if all(coll.status != STATUS_ACTIVE for coll in connected_collaborations):
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as the service is not connected to any active collaborations")
        return not_authorized_func(service.name, COLLABORATION_NOT_ACTIVE)

    now = datetime.now()
    if all(m.expiry_date and m.expiry_date < now for m in memberships):
        logger.error(f"Returning unauthorized for user {uid} and service_entity_id {service_entity_id}"
                     f" as none of the collaboration memberships are active")
        return not_authorized_func(service.name, MEMBERSHIP_NOT_ACTIVE)

    for coll in connected_collaborations:
        coll.last_activity_date = datetime.now()
        db.session.merge(coll)

    user.last_accessed_date = datetime.now()
    user.last_login_date = datetime.now()
    user.suspend_notifications = []
    user = db.session.merge(user)
    db.session.commit()

    cfg = current_app.app_config
    namespace = cfg.get("entitlement_group_namespace", "urn:bla")

    # gather groups and collaborations
    #
    # we're (partially) adhering to AARC's Guidelines on expressing group membership and role information
    # (see https://aarc-project.eu/guidelines/aarc-g002/)
    # Which prescribes group/co membership need to be expressed as entitlements of the form
    # <NAMESPACE>:group:<GROUP>[:<SUBGROUP>*][:role=<ROLE>]#<GROUP-AUTHORITY>
    # The namespace is defined in the config file (variable entitlement_group_namespace)
    # COs map to GROUP and Groups map to SUBGROUP
    # We don't use roles, so we omit those.
    # Also, we omit the GROUP-AUTHORITY (and are therefore not completely compliant), as it complicates parsing the
    # entitlement, will confuse Services, and the spec fails to make clear what the usecase is, exactly.
    memberships = set()
    for collaboration in connected_collaborations:
        # add the CO itself, the Organisation this CO belongs to, and the groups within the CO
        memberships.add(f"{namespace}:group:{collaboration.organisation.short_name}")
        memberships.add(f"{namespace}:group:{collaboration.organisation.short_name}:{collaboration.short_name}")
        for g in collaboration.groups:
            if g.is_member(user.id):
                memberships.add(f"{namespace}:group:{collaboration.organisation.short_name}:"
                                f"{collaboration.short_name}:{g.short_name}")

    logger.info(f"Returning attributes {memberships} for user {uid} and service_entity_id {service_entity_id}")
    return authorized_func(user, memberships)


# Endpoint for SATOSA/eduteams
@user_saml_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")

    def not_authorized_func(_, status):
        logger = ctx_logger("user_api")
        if status == USER_UNKNOWN:
            return {"error": f"user {uid} is unknown"}, 404
        elif status == USER_IS_SUSPENDED:
            return {"error": f"user {uid} is suspended"}, 404
        elif status == SERVICE_UNKNOWN or status == SERVICE_NOT_CONNECTED or status == COLLABORATION_NOT_ACTIVE:
            return {}, 200
        else:
            logger.error(f"Unhandled status {status} in not_authorized_func")
            raise Exception(f"Unhandled status {status} in not_authorized_func")

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

    def not_authorized_func(service_name, status):
        base_url = current_app.app_config.base_url
        parameters = urlencode({"service_name": service_name, "error_status": status})
        return {
                   "status": {
                       "result": "unauthorized",
                       "redirect_url": f"{base_url}/service-denied?{parameters}",
                       "error_status": status
                   }
               }, 200

    def authorized_func(user, memberships):
        eppn_scope = current_app.app_config.eppn_scope.strip()
        result = {
            "status": {
                "result": "authorized",
            }
        }
        attrs = {
            "eduPersonEntitlement": list(memberships),
            "eduPersonPrincipalName": [f"{user.username}@{eppn_scope}"],
            "uid": [user.username],
            "sshkey": [ssh_key.ssh_value for ssh_key in user.ssh_keys]
        }
        result["attributes"] = attrs
        return result, 200

    return _do_attributes(uid, service_entity_id, not_authorized_func, authorized_func)
