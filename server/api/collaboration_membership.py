# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from server.api.base import ctx_logger
from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.db import CollaborationMembership, db, UserServiceProfile, AuthorisationGroup, Collaboration

collaboration_membership_api = Blueprint("collaboration_membership_api", __name__,
                                         url_prefix="/api/collaboration_memberships")


@collaboration_membership_api.route("/<collaboration_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration_membership(collaboration_id, user_id):
    confirm_collaboration_admin(collaboration_id)

    user_service_profiles = UserServiceProfile.query \
        .join(UserServiceProfile.authorisation_group) \
        .join(AuthorisationGroup.collaboration) \
        .filter(Collaboration.id == collaboration_id) \
        .filter(UserServiceProfile.user_id == user_id) \
        .all()
    for usp in user_service_profiles:
        db.session.delete(usp)

    logger = ctx_logger("collaboration_membership_api")
    logger.info(f"Deleted {len(user_service_profiles)} user_service_profiles of {user_id}")

    row_count = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .delete()

    logger.info(f"Deleted {row_count} collaboration memberships of {user_id}")
    return (None, 204) if row_count > 0 else (None, 404)


@collaboration_membership_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration_membership_role():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    user_id = client_data["userId"]
    role = client_data["role"]

    confirm_collaboration_admin(collaboration_id)

    collaboration_membership = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .one()
    collaboration_membership.role = role

    db.session.merge(collaboration_membership)
    return collaboration_membership, 201
