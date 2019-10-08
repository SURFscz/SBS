# -*- coding: future_fstrings -*-
import uuid

from flask import Blueprint, current_app
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint, query_param, ctx_logger
from server.auth.security import current_user_id, confirm_owner_of_user_service_profile, confirm_read_access
from server.auth.user_claims import attribute_saml_mapping, user_service_profile_claims, is_member_of_saml, \
    user_service_profile_saml_mapping
from server.db.db import CollaborationMembership, UserServiceProfile, User, Service, AuthorisationGroup, db
from server.db.models import update

user_service_profile_api = Blueprint("user_service_profiles_api", __name__, url_prefix="/api/user_service_profiles")


def create_user_service_profile(service_ids, authorisation_group, current_user, user_id):
    for service_id in service_ids:
        profile = UserServiceProfile(service_id=service_id, authorisation_group=authorisation_group,
                                     user_id=user_id, status="active",
                                     created_by=current_user["uid"], updated_by=current_user["uid"],
                                     identifier=str(uuid.uuid4()))
        db.session.add(profile)


# Endpoint for SATOSA
@user_service_profile_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    confirm_read_access()
    logger = ctx_logger("user_service_claims")

    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")
    user_service_profiles = UserServiceProfile.query \
        .join(Service, Service.entity_id == service_entity_id) \
        .join(UserServiceProfile.user) \
        .filter(User.uid == uid) \
        .all()

    if len(user_service_profiles) == 0:
        logger.info(f"Returning empty dict as attributes for user {uid} and service_entity_id {service_entity_id}")
        return {}, 200

    result = {}
    user = user_service_profiles[0].user
    for k, v in attribute_saml_mapping.items():
        val = getattr(user, k)
        if val:
            val = val.split(",") if "," in val else [val]
            result.setdefault(v, []).extend(val)

    for user_service_profile in user_service_profiles:
        for claim in user_service_profile_claims:
            user_service_profile_val = getattr(user_service_profile, claim)
            if user_service_profile_val:
                result.setdefault(user_service_profile_saml_mapping[claim], []).extend([user_service_profile_val])
    cos = set(map(lambda usp: usp.authorisation_group.collaboration.short_name, user_service_profiles))
    if dict(current_app.app_config).get("generate_multiple_eppn", False):
        eppns = list(map(lambda co: f"{user.username}@{co}.{current_app.app_config.base_scope}", cos))
        result.setdefault("urn:mace:dir:attribute-def:eduPersonPrincipalName", []).extend(eppns)

    authorisation_group_short_names = list(
        map(lambda usp: usp.authorisation_group.short_name, user_service_profiles))
    collaboration_names = list(
        map(lambda usp: usp.authorisation_group.collaboration.name, user_service_profiles))
    is_member_of = list(set(authorisation_group_short_names + collaboration_names))
    result.setdefault(is_member_of_saml, []).extend(is_member_of)
    result = {k: list(set(v)) for k, v in result.items()}

    logger.info(f"Returning attributes for user {uid} and service_entity_id {service_entity_id}")
    return result, 200


@user_service_profile_api.route("/<user_service_profile_id>", strict_slashes=False)
@json_endpoint
def user_service_profile_by_id(user_service_profile_id):
    user_id = current_user_id()
    user_service_profile = UserServiceProfile.query \
        .join(UserServiceProfile.authorisation_group) \
        .join(UserServiceProfile.service) \
        .join(CollaborationMembership.collaboration) \
        .options(contains_eager(UserServiceProfile.authorisation_group)
                 .contains_eager(AuthorisationGroup.collaboration)) \
        .options(contains_eager(UserServiceProfile.service)) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(UserServiceProfile.id == user_service_profile_id) \
        .one()

    return user_service_profile, 200


@user_service_profile_api.route("/", strict_slashes=False)
@json_endpoint
def my_user_service_profiles():
    user_id = current_user_id()
    profiles = UserServiceProfile.query \
        .join(UserServiceProfile.authorisation_group) \
        .join(AuthorisationGroup.collaboration) \
        .join(UserServiceProfile.service) \
        .options(contains_eager(UserServiceProfile.authorisation_group)
                 .contains_eager(AuthorisationGroup.collaboration)) \
        .options(contains_eager(UserServiceProfile.service)) \
        .filter(UserServiceProfile.user_id == user_id) \
        .all()
    return profiles, 200


@user_service_profile_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user_service_profile():
    confirm_owner_of_user_service_profile()
    return update(UserServiceProfile, allow_child_cascades=False)
