# -*- coding: future_fstrings -*-

from datetime import datetime

from flask import Blueprint, current_app

from server.api.base import json_endpoint, query_param, send_error_mail
from server.auth.security import confirm_read_access
from server.db.db import db
from server.db.domain import User, Service
from server.logger.context_logger import ctx_logger

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")

# Independent mapping, so different attribute names can be send back
custom_saml_mapping = {
    "multi_value_attributes": ["edu_members", "affiliation", "scoped_affiliation", "entitlement"],
    "attribute_saml_mapping": {
        "uid": "cuid",
        "username": "uid",
        "ssh_key": "sshKey",
    },
    "custom_attribute_saml_mapping": {
        "memberships": "eduPersonEntitlement",
    }
}


# Endpoint for SATOSA/eduteams
@user_saml_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    confirm_read_access()
    logger = ctx_logger("user_api")

    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")

    user = User.query.filter(User.uid == uid).one()
    if user.suspended:
        logger.error(f"Returning error for user {uid} and service_entity_id {service_entity_id} as user is suspended")
        return {"error": f"user {uid} is suspended"}, 404

    service = Service.query.filter(Service.entity_id == service_entity_id).first()
    if not service:
        msg = f"Returning empty dict as attributes for user {uid} and service_entity_id {service_entity_id} " \
              f"because service does not exists"
        logger.error(msg)
        send_error_mail(tb=msg, session_exists=False)
        return {}, 200

    connected_collaborations = []
    for cm in user.collaboration_memberships:
        connected = list(filter(lambda s: s.id == service.id, cm.collaboration.services))
        if connected or list(filter(lambda s: s.id == service.id, cm.collaboration.organisation.services)):
            connected_collaborations.append(cm.collaboration)
    if not connected_collaborations:
        logger.info(f"Returning empty dict as attributes for user {uid} and service_entity_id {service_entity_id} "
                    f"because user has no access to the service")
        return {}, 200

    # gather regular user attributes
    result = {}
    user.last_accessed_date = datetime.now()
    user.last_login_date = datetime.now()
    user.suspend_notifications = []
    user = db.session.merge(user)
    db.session.commit()

    for k, v in custom_saml_mapping["attribute_saml_mapping"].items():
        val = getattr(user, k)
        if val:
            result[v] = val.split(",") if k in custom_saml_mapping["multi_value_attributes"] else [val]

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
    cfg = current_app.app_config
    namespace = cfg.get("entitlement_group_namespace", "urn:bla")

    memberships = set()
    for collaboration in connected_collaborations:
        memberships.add(f"{namespace}:group:{collaboration.organisation.short_name}:{collaboration.short_name}")
        for g in collaboration.groups:
            memberships.add(f"{namespace}:group:{collaboration.organisation.short_name}:"
                            f"{collaboration.short_name}:{g.short_name}")
    membership_attribute = custom_saml_mapping['custom_attribute_saml_mapping']['memberships']
    result[membership_attribute] = memberships

    result = {k: list(set(v)) for k, v in result.items()}

    logger.info(f"Returning attributes for user {uid} and service_entity_id {service_entity_id}")
    return result, 200
