# -*- coding: future_fstrings -*-

from datetime import datetime

from flask import Blueprint, current_app

from server.api.base import json_endpoint, query_param, ctx_logger
from server.auth.security import confirm_read_access
from server.db.db import db
from server.db.domain import User, CollaborationMembership, Service, Collaboration
from server.db.models import flatten

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")

# Independent mapping, so different attribute names can be send back
custom_saml_mapping = {
    "multi_value_attributes": ["edu_members", "affiliation", "scoped_affiliation", "entitlement"],
    "attribute_saml_mapping": {
        "uid": "urn:mace:dir:attribute-def:uid",
        "name": "urn:mace:dir:attribute-def:cn",
        "address": "urn:mace:dir:attribute-def:postalAddress",
        "nick_name": "urn:mace:dir:attribute-def:displayName",
        "username": "urn:mace:dir:attribute-def:shortName",
        "edu_members": "urn:mace:dir:attribute-def:isMemberOf",
        "affiliation": "urn:mace:dir:attribute-def:eduPersonAffiliation",
        "scoped_affiliation": "urn:mace:dir:attribute-def:eduPersonScopedAffiliation",
        "entitlement": "urn:mace:dir:attribute-def:eduPersonEntitlement",
        "schac_home_organisation": "urn:mace:terena.org:attribute-def:schacHomeOrganization",
        "family_name": "urn:mace:dir:attribute-def:sn",
        "given_name": "urn:mace:dir:attribute-def:givenName",
        "email": "urn:mace:dir:attribute-def:mail",
        "ssh_key": "urn:oid:1.3.6.1.4.1.24552.1.1.1.13"
    }
}


# Endpoint for SATOSA
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

    services = Service.query \
        .join(Service.collaborations) \
        .join(Collaboration.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .filter(User.uid == uid) \
        .filter(Service.entity_id == service_entity_id) \
        .all()

    if len(services) == 0:
        logger.info(f"Returning empty dict as attributes for user {uid} and service_entity_id {service_entity_id}")
        return {}, 200

    result = {}
    user.last_accessed_date = datetime.now()
    user.last_login_date = datetime.now()
    user = db.session.merge(user)
    db.session.commit()

    for k, v in custom_saml_mapping["attribute_saml_mapping"].items():
        val = getattr(user, k)
        if val:
            result[v] = val.split(",") if k in custom_saml_mapping["multi_value_attributes"] else [val]

    collaboration_names = list(map(lambda cm: cm.collaboration.short_name, user.collaboration_memberships))
    cfg = current_app.app_config
    if cfg.get("generate_multiple_eppn", False):
        eppns = list(map(lambda co: f"{user.username}@{co}.{cfg.base_scope}", set(collaboration_names)))
        result["urn:mace:dir:attribute-def:eduPersonPrincipalName"] = eppns

    groups = flatten(list(map(lambda cm: cm.collaboration.groups, user.collaboration_memberships)))

    group_short_names = list(map(lambda group: group.short_name, groups))
    is_member_of = list(set(group_short_names + collaboration_names))
    result[custom_saml_mapping["attribute_saml_mapping"]["edu_members"]] = is_member_of
    result = {k: list(set(v)) for k, v in result.items()}

    logger.info(f"Returning attributes for user {uid} and service_entity_id {service_entity_id}")
    return result, 200
