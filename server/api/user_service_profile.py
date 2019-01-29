from flask import Blueprint, request as current_request
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.api.security import current_user_id
from server.db.db import CollaborationMembership, UserServiceProfile, User, Service

UID_HEADER_NAME = "MELLON_cmuid"

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
        "status": user_service_profile.status
    }
    return {k: v for k, v in res.items() if v is not None}


# Endpoint for SATOSA
@user_service_profile_api.route("/attributes", strict_slashes=False)
@json_endpoint
def attributes():
    uid = current_request.args.get("uid")
    service_entity_id = current_request.args.get("service_entity_id")
    user_service_profiles = UserServiceProfile.query \
        .options(joinedload(UserServiceProfile.service)) \
        .join(UserServiceProfile.service) \
        .join(UserServiceProfile.collaboration_membership) \
        .join(CollaborationMembership.user) \
        .filter(User.uid == uid) \
        .filter(Service.entity_id == service_entity_id) \
        .all()

    attributes_per_service = list(map(_attributes_per_service, user_service_profiles))
    if len(user_service_profiles) > 0:
        user = user_service_profiles[0].collaboration_membership.user
        attributes_per_service.append({
            "global": True,
            "uid": user.uid,
            "name": user.name,
            "email": user.email
        })
    return [{k: v for k, v in res.items() if v is not None} for res in attributes_per_service], 200


@user_service_profile_api.route("/", strict_slashes=False)
@json_endpoint
def my_user_service_profiles():
    user_id = current_user_id()
    res = UserServiceProfile.query \
        .join(UserServiceProfile.collaboration_membership_id) \
        .join(CollaborationMembership.user) \
        .outerjoin(UserServiceProfile.service) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()

    return res, 200
