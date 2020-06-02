# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request

from server.api.base import ctx_logger
from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin, confirm_organisation_admin, current_user_uid, \
    current_user_id
from server.db.domain import CollaborationMembership, db, Collaboration

collaboration_membership_api = Blueprint("collaboration_membership_api", __name__,
                                         url_prefix="/api/collaboration_memberships")


@collaboration_membership_api.route("/<collaboration_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration_membership(collaboration_id, user_id):
    confirm_collaboration_admin(collaboration_id)

    logger = ctx_logger("collaboration_membership_api")

    memberships = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    for membership in memberships:
        db.session.delete(membership)

    logger.info(f"Deleted {len(memberships)} collaboration memberships of {user_id}")

    res = { 'collabotation_id': collaboration_id, 'user_id': user_id }

    return (res, 204) if len(memberships) > 0 else (None, 404)


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


@collaboration_membership_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_collaboration_membership_role():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    collaboration = Collaboration.query.get(collaboration_id)

    confirm_organisation_admin(collaboration.organisation_id)

    user_id = current_user_id()
    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration_id=collaboration.id,
                                                       role="admin",
                                                       created_by=current_user_uid(),
                                                       updated_by=current_user_uid())

    collaboration_membership = db.session.merge(collaboration_membership)
    return collaboration_membership, 201
