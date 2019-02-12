from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import current_user_id, confirm_collaboration_admin
from server.db.db import CollaborationMembership, db

collaboration_membership_api = Blueprint("collaboration_membership_api", __name__,
                                         url_prefix="/api/collaboration_memberships")


@collaboration_membership_api.route("/<collaboration_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration_membership(collaboration_id, user_id):
    confirm_collaboration_admin(collaboration_id)

    row_count = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .delete()
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


@collaboration_membership_api.route("/", strict_slashes=False)
@json_endpoint
def my_collaboration_memberships():
    user_id = current_user_id()
    collaboration_memberships = CollaborationMembership.query \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()

    for collaboration_membership in collaboration_memberships:
        authorisation_groups = collaboration_membership.authorisation_groups
        for authorisation_group in authorisation_groups:
            authorisation_group.collaboration
            user_service_profiles = authorisation_group.user_service_profiles
            for user_service_profile in user_service_profiles:
                user_service_profile.service

    return collaboration_memberships, 200
