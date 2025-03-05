from datetime import datetime, timezone

from flask import Blueprint, request as current_request, jsonify

from server.api.base import json_endpoint, emit_socket
from server.auth.security import confirm_collaboration_admin, current_user_uid, \
    current_user_id, confirm_organisation_admin_or_manager
from server.db.defaults import STATUS_ACTIVE
from server.db.activity import update_last_activity_date
from server.db.domain import CollaborationMembership, db, Collaboration
from server.logger.context_logger import ctx_logger
from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed

collaboration_membership_api = Blueprint("collaboration_membership_api", __name__,
                                         url_prefix="/api/collaboration_memberships")


def do_auto_provision_groups(collaboration, collaboration_id, collaboration_membership):
    auto_provision_groups = [group for group in collaboration.groups if group.auto_provision_members]
    for group in auto_provision_groups:
        group.collaboration_memberships.append(collaboration_membership)
        db.session.merge(group)
    db.session.commit()
    for group in auto_provision_groups:
        broadcast_group_changed(group.id)
    emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)
    broadcast_collaboration_changed(collaboration_id)


@collaboration_membership_api.route("/<int:collaboration_id>/<int:user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration_membership(collaboration_id, user_id):
    if current_user_id() != int(user_id):
        confirm_collaboration_admin(collaboration_id)

    logger = ctx_logger("collaboration_membership_api")

    memberships = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()

    logger.info(f"Deleted {len(memberships)} collaboration memberships of {user_id}")

    if memberships:
        for membership in memberships:
            db.session.delete(membership)

        update_last_activity_date(collaboration_id)

        user = memberships[0].user

        res = {'collaboration_id': int(collaboration_id), 'user_id': user.id}
        db.session.commit()

        emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)
        broadcast_collaboration_changed(collaboration_id)

        return res, 204
    else:
        return None, 404


@collaboration_membership_api.route("/expiry", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration_membership_expiry_date():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaboration_id"]
    membership_id = client_data["membership_id"]
    membership_expiry_date = client_data.get("expiry_date")
    if membership_expiry_date:
        membership_expiry_date = datetime.fromtimestamp(client_data["expiry_date"], tz=timezone.utc)

    confirm_collaboration_admin(collaboration_id)

    collaboration_membership = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.id == membership_id) \
        .one()
    collaboration_membership.expiry_date = membership_expiry_date
    collaboration_membership.status = STATUS_ACTIVE

    update_last_activity_date(collaboration_id)

    emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)

    db.session.merge(collaboration_membership)
    return collaboration_membership, 201


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

    update_last_activity_date(collaboration_id)

    emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)

    db.session.merge(collaboration_membership)
    return collaboration_membership, 201


@collaboration_membership_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_collaboration_membership_role():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    collaboration = db.session.get(Collaboration, collaboration_id)

    confirm_organisation_admin_or_manager(collaboration.organisation_id)

    user_id = current_user_id()
    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration_id=collaboration.id,
                                                       role="admin",
                                                       created_by=current_user_uid(),
                                                       updated_by=current_user_uid())
    collaboration_membership = db.session.merge(collaboration_membership)
    collaboration_membership_json = jsonify(collaboration_membership).json

    do_auto_provision_groups(collaboration, collaboration_id, collaboration_membership)

    return collaboration_membership_json, 201
