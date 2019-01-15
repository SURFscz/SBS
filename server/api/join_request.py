from flask import Blueprint, session, request as current_request, current_app
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.api.security import confirm_write_access, confirm_collaboration_admin
from server.db.db import CollaborationMembership, Collaboration, JoinRequest, db
from server.db.models import delete
from server.mail import mail_collaboration_join_request

join_request_api = Blueprint("join_request_api", __name__, url_prefix="/api/join_requests")


def _ensure_access_to_join_request(join_request_id):
    user_id = session["user"]["id"]
    count = JoinRequest.query \
        .join(JoinRequest.collaboration) \
        .join(Collaboration.collaboration_memberships) \
        .filter(or_(CollaborationMembership.user_id == user_id, CollaborationMembership.role == "admin")) \
        .filter(JoinRequest.id == join_request_id).count()
    return count > 0


@join_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def join_request():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    collaboration = Collaboration.query \
        .filter(Collaboration.id == collaboration_id).one()

    admin_members = list(
        filter(lambda membership: membership.role == "admin", collaboration.collaboration_memberships))
    admin_emails = list(map(lambda membership: membership.user.email, admin_members))

    # We need to delete other outstanding join_request for the same collaboration and user
    existing_join_requests = JoinRequest.query \
        .join(JoinRequest.user) \
        .filter(JoinRequest.collaboration_id == collaboration_id) \
        .filter(JoinRequest.user_id == session["user"]["id"]) \
        .all()
    for jr in existing_join_requests:
        db.session.delete(jr)

    join_request = JoinRequest(message=client_data["motivation"],
                               reference=client_data["reference"],
                               user_id=session["user"]["id"],
                               collaboration=collaboration)
    join_request = db.session.merge(join_request)
    db.session.commit()

    mail_collaboration_join_request({
        "salutation": "Dear",
        "collaboration": collaboration,
        "user": session["user"],
        "base_url": current_app.app_config.base_url,
        "join_request": join_request
    }, collaboration, admin_emails)
    return {}, 201


@join_request_api.route("/approve_request/<join_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_join_request(join_request_id):
    join_request = JoinRequest.query.options(joinedload(JoinRequest.collaboration)).get(join_request_id)

    confirm_collaboration_admin(join_request.collaboration_id)

    return join_request, 201


@join_request_api.route("/<join_request_id>", strict_slashes=False)
@json_endpoint
def join_request_by_id(join_request_id):
    confirm_write_access(join_request_id, override_func=_ensure_access_to_join_request)
    join_request = JoinRequest.query.get(join_request_id)
    return join_request, 200


@join_request_api.route("/<join_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_join_request(join_request_id):
    confirm_write_access(join_request_id, override_func=_ensure_access_to_join_request)
    return delete(JoinRequest, join_request_id)
