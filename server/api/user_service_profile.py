from flask import Blueprint
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint, query_param
from server.auth.security import current_user_id, confirm_owner_of_user_service_profile
from server.db.db import CollaborationMembership, UserServiceProfile, User, Service, AuthorisationGroup
from server.db.models import update

user_service_profile_api = Blueprint("user_service_profiles_api", __name__, url_prefix="/api/user_service_profiles")


def _attributes_per_service(user_service_profile: UserServiceProfile):
    res = {
        "service_entity_id": user_service_profile.service.entity_id,
        "name": user_service_profile.name,
        "ssh_key": user_service_profile.ssh_key,
        "email": user_service_profile.email,
        "address": user_service_profile.address,
        "role": user_service_profile.role,
        "identifier": user_service_profile.identifier,
        "telephone_number": user_service_profile.telephone_number,
        "status": user_service_profile.status,
        "authorisation_group": {
            "name": user_service_profile.authorisation_group.name,
            "short_name": user_service_profile.authorisation_group.short_name,
            "status": user_service_profile.authorisation_group.status
        }
    }
    return res


# Endpoint for SATOSA
@user_service_profile_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    uid = query_param("uid")
    service_entity_id = query_param("service_entity_id")
    user_service_profiles = UserServiceProfile.query \
        .join(UserServiceProfile.service) \
        .join(UserServiceProfile.user) \
        .join(UserServiceProfile.authorisation_group) \
        .options(contains_eager(UserServiceProfile.service)) \
        .options(contains_eager(UserServiceProfile.user)) \
        .options(contains_eager(UserServiceProfile.authorisation_group)) \
        .filter(User.uid == uid) \
        .filter(Service.entity_id == service_entity_id) \
        .all()

    attributes_per_service = list(map(_attributes_per_service, user_service_profiles))
    if len(user_service_profiles) > 0:
        user = user_service_profiles[0].user
        attributes_per_service.append({
            "global": True,
            **{k: getattr(user, k) for k in User.__table__.columns._data.keys()}
        })
    return [{k: v for k, v in res.items() if v is not None} for res in attributes_per_service], 200


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
