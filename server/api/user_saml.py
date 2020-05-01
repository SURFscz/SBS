# -*- coding: future_fstrings -*-

from flask import Blueprint, current_app

from server.api.base import json_endpoint, query_param, ctx_logger
from server.auth.security import confirm_read_access

from server.db.domain import User, CollaborationMembership, Service, Collaboration
from server.db.models import flatten

user_saml_api = Blueprint("user_saml_api", __name__, url_prefix="/api/users")

# Independent mapping, so different attribute names can be send back
custom_saml_mapping = {
    "multi_value_attributes": ["edu_members", "affiliation", "scoped_affiliation", "entitlement"],
    "attribute_saml_mapping": {
        "uid": "sbs_id",
        "name": "cn",
        "address": "postalAddress",
        "nick_name": "displayName",
        "username": "uid",
        "edu_members": "isMemberOf",
        "affiliation": "eduPersonAffiliation",
        "scoped_affiliation": "eduPersonScopedAffiliation",
        "entitlement": "eduPersonEntitlement",
        "schac_home_organisation": "schacHomeOrganization",
        "family_name": "sn",
        "given_name": "givenName",
        "email": "mail",
        "ssh_key": "sshKey"
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
    user = User.query.filter(User.uid == uid).one()
    for k, v in custom_saml_mapping["attribute_saml_mapping"].items():
        val = getattr(user, k)
        if val:
            result[v] = val.split(",") if k in custom_saml_mapping["multi_value_attributes"] else [val]

    collaboration_names = list(map(lambda cm: cm.collaboration.short_name, user.collaboration_memberships))
    cfg = current_app.app_config

    groups = flatten(list(map(lambda cm: cm.collaboration.groups, user.collaboration_memberships)))

    group_short_names = list(map(lambda group: group.short_name, groups))
    is_member_of = list(set(group_short_names + collaboration_names))
    result[custom_saml_mapping["attribute_saml_mapping"]["edu_members"]] = is_member_of
    result = {k: list(set(v)) for k, v in result.items()}

    logger.info(f"Returning attributes for user {uid} and service_entity_id {service_entity_id}")
    return result, 200
