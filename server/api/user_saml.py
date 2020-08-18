# -*- coding: future_fstrings -*-

from datetime import datetime

from flask import Blueprint, current_app

from server.api.base import json_endpoint, query_param, ctx_logger
from server.auth.security import confirm_read_access
from server.db.db import db
from server.db.domain import User, CollaborationMembership, Service, Collaboration, Organisation, OrganisationMembership

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
        logger.info(f"Returning error for user {uid} and service_entity_id {service_entity_id} as user is suspended")
        return {"error": f"user {uid} is suspended"}, 404

    # Service connected to a collaboration where the user is a member of
    services = Service.query \
        .join(Service.collaborations) \
        .join(Collaboration.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .filter(User.uid == uid) \
        .filter(Service.entity_id == service_entity_id) \
        .all()

    if len(services) == 0:
        # Service connected to a organisation which has a collaboration where the user is a member of
        services = Service.query \
            .join(Service.organisations) \
            .join(Organisation.collaborations) \
            .join(Collaboration.collaboration_memberships) \
            .join(CollaborationMembership.user) \
            .filter(User.uid == uid) \
            .filter(Service.entity_id == service_entity_id) \
            .all()

    if len(services) == 0:
        # Service connected to a organisation where the user is a member of
        services = Service.query \
            .join(Service.organisations) \
            .join(Organisation.organisation_memberships) \
            .join(OrganisationMembership.user) \
            .filter(User.uid == uid) \
            .filter(Service.entity_id == service_entity_id) \
            .all()

    if len(services) == 0:
        logger.info(f"Returning empty dict as attributes for user {uid} and service_entity_id {service_entity_id}")
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
    # entitlement, will confuse Services, and  the spec fails to make clear what the usecase is, exactly.
    cfg = current_app.app_config
    namespace = cfg.get("entitlement_group_namespace", "urn:bla")

    memberships = set()
    for cm in user.collaboration_memberships:
        memberships.add(f"{namespace}:group:{cm.collaboration.short_name}")
        for g in cm.collaboration.groups:
            memberships.add(f"{namespace}:group:{cm.collaboration.short_name}:{g.short_name}")
    membership_attribute = custom_saml_mapping['custom_attribute_saml_mapping']['memberships']
    result[membership_attribute] = memberships

    result = {k: list(set(v)) for k, v in result.items()}

    logger.info(f"Returning attributes for user {uid} and service_entity_id {service_entity_id}")
    return result, 200
