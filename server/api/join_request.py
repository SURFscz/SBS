# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import Conflict, BadRequest

from server.api.base import json_endpoint, STATUS_DENIED, STATUS_APPROVED
from server.api.collaboration_request import STATUS_OPEN
from server.auth.security import confirm_collaboration_admin, current_user_id, current_user, \
    current_user_name, current_user_uid
from server.db.domain import CollaborationMembership, Collaboration, JoinRequest, db
from server.db.models import delete
from server.mail import mail_collaboration_join_request, mail_accepted_declined_join_request

join_request_api = Blueprint("join_request_api", __name__, url_prefix="/api/join_requests")


def _get_join_request(join_request_hash):
    return JoinRequest.query \
        .join(JoinRequest.collaboration) \
        .join(JoinRequest.user) \
        .options(contains_eager(JoinRequest.collaboration)) \
        .options(contains_eager(JoinRequest.user)) \
        .filter(JoinRequest.hash == join_request_hash) \
        .one()


def _is_already_member(client_data):
    collaboration_id = client_data["collaborationId"]
    collaboration = Collaboration.query \
        .filter(Collaboration.id == collaboration_id).one()
    user_id = current_user_id()
    is_member = collaboration.is_member(user_id)
    return is_member


@join_request_api.route("/already-member", methods=["POST"], strict_slashes=False)
@json_endpoint
def already_member():
    return _is_already_member(current_request.get_json()), 200


@join_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def new_join_request():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    collaboration = Collaboration.query \
        .filter(Collaboration.id == collaboration_id).one()

    if collaboration.disable_join_requests:
        raise Conflict(f"Collaboration {collaboration.name} has disabled join requests")

    if _is_already_member(client_data):
        raise Conflict(f"User {current_user_name()} is already a member of {collaboration.name}")

    admin_members = list(
        filter(lambda membership: membership.role == "admin", collaboration.collaboration_memberships))
    admin_emails = list(map(lambda membership: membership.user.email, admin_members))

    # We need to delete other outstanding join_request for the same collaboration and user
    user_id = current_user_id()
    existing_join_requests = JoinRequest.query \
        .join(JoinRequest.user) \
        .filter(JoinRequest.collaboration_id == collaboration_id) \
        .filter(JoinRequest.user_id == user_id) \
        .all()
    for jr in existing_join_requests:
        db.session.delete(jr)

    join_request = JoinRequest(message=client_data["motivation"],
                               reference=client_data["reference"] if "reference" in client_data else None,
                               user_id=user_id,
                               status=STATUS_OPEN,
                               collaboration_id=collaboration.id,
                               hash=token_urlsafe())
    join_request = db.session.merge(join_request)
    db.session.commit()

    mail_collaboration_join_request({
        "salutation": "Dear",
        "collaboration": collaboration,
        "user": current_user(),
        "base_url": current_app.app_config.base_url,
        "join_request": join_request
    }, collaboration, admin_emails)

    return {}, 201


@join_request_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_join_request():
    join_request_hash = current_request.get_json()["hash"]
    join_request = _get_join_request(join_request_hash)
    collaboration = join_request.collaboration

    confirm_collaboration_admin(collaboration.id)

    user_id = join_request.user.id
    if collaboration.is_member(user_id):
        raise Conflict(f"User {join_request.user.name} is already a member of {collaboration.name}")

    mail_accepted_declined_join_request({
        "salutation": f"Dear {join_request.user.name}",
        "base_url": current_app.app_config.base_url,
        "administrator": current_user_name(),
        "join_request": join_request,
        "user": join_request.user},
        join_request,
        True,
        [join_request.user.email])

    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration_id=collaboration.id,
                                                       role="member",
                                                       created_by=current_user_uid(),
                                                       updated_by=current_user_uid())

    join_request.status = STATUS_APPROVED
    db.session.merge(collaboration_membership)
    db.session.merge(join_request)

    res = {'collaboration_id': collaboration.id, 'user_id': user_id}
    return res, 201


@join_request_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_join_request():
    join_request_hash = current_request.get_json()["hash"]
    rejection_reason = current_request.get_json()["rejection_reason"]
    join_request = _get_join_request(join_request_hash)

    confirm_collaboration_admin(join_request.collaboration.id)

    mail_accepted_declined_join_request({"salutation": f"Dear {join_request.user.name}",
                                         "base_url": current_app.app_config.base_url,
                                         "rejection_reason": rejection_reason,
                                         "administrator": current_user_name(),
                                         "join_request": join_request,
                                         "user": join_request.user},
                                        join_request,
                                        False,
                                        [join_request.user.email])
    join_request.status = STATUS_DENIED
    join_request.rejection_reason = rejection_reason
    db.session.merge(join_request)

    return None, 201


@join_request_api.route("/<join_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_join_request(join_request_id):
    join_request = JoinRequest.query.get(join_request_id)
    confirm_collaboration_admin(join_request.collaboration_id)
    if join_request.status == STATUS_OPEN:
        raise BadRequest("Join request with status 'open' can not be deleted")
    return delete(JoinRequest, join_request_id)
