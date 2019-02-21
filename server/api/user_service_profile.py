from flask import Blueprint
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint, query_param
from server.auth.security import current_user_id, confirm_owner_of_user_service_profile
from server.auth.user_claims import attribute_oidc_mapping, user_service_profile_claims
from server.db.db import CollaborationMembership, UserServiceProfile, User, Service, AuthorisationGroup
from server.db.models import update

user_service_profile_api = Blueprint("user_service_profiles_api", __name__, url_prefix="/api/user_service_profiles")


# Endpoint for SATOSA
@user_service_profile_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")
    user = User.query \
        .outerjoin(User.user_service_profiles) \
        .outerjoin(UserServiceProfile.authorisation_group) \
        .outerjoin(AuthorisationGroup.collaboration) \
        .outerjoin(Service, Service.entity_id == service_entity_id) \
        .options(contains_eager(User.user_service_profiles)
                 .contains_eager(UserServiceProfile.authorisation_group)
                 .contains_eager(AuthorisationGroup.collaboration)) \
        .filter(User.uid == uid).one()

    result = {}
    for k, v in attribute_oidc_mapping.items():
        val = getattr(user, k)
        if val:
            val = val.split(",") if "," in val else [val]
            result.setdefault(v, []).extend(val)
    for user_service_profile in user.user_service_profiles:
        for claim in user_service_profile_claims:
            user_service_profile_val = getattr(user_service_profile, claim)
            if user_service_profile_val:
                result.setdefault(attribute_oidc_mapping[claim], []).extend([user_service_profile_val])
    authorisation_group_short_names = list(
        map(lambda usp: usp.authorisation_group.short_name, user.user_service_profiles))
    collaboration_names = list(
        map(lambda usp: usp.authorisation_group.collaboration.name, user.user_service_profiles))
    is_member_of = list(set(authorisation_group_short_names + collaboration_names))
    result.setdefault("isMemberOf", []).extend(is_member_of)
    result = {k: list(set(v)) for k, v in result.items()}
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
