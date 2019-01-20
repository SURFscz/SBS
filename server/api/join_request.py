from flask import Blueprint, session, request as current_request, current_app
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint
from server.api.security import confirm_write_access, confirm_collaboration_admin
from server.db.db import CollaborationMembership, Collaboration, JoinRequest, db
from server.db.models import delete
from server.mail import mail_collaboration_join_request, mail_accepted_declined_join_request

join_request_api = Blueprint("join_request_api", __name__, url_prefix="/api/join_requests")


def _ensure_access_to_join_request(join_request_id):
    user_id = session["user"]["id"]
    count = JoinRequest.query \
        .filter(JoinRequest.id == join_request_id) \
        .filter(JoinRequest.user_id == user_id) \
        .count()
    if count > 0:
        return True

    count = JoinRequest.query \
        .join(JoinRequest.collaboration) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(JoinRequest.id == join_request_id) \
        .filter(CollaborationMembership.role == "admin") \
        .count()
    return count > 0


def _get_join_request(join_request_id):
    return JoinRequest.query \
        .join(JoinRequest.collaboration) \
        .join(JoinRequest.user) \
        .options(contains_eager(JoinRequest.collaboration)) \
        .options(contains_eager(JoinRequest.user)) \
        .filter(JoinRequest.id == join_request_id) \
        .one()


@join_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def new_join_request():
    client_data = current_request.get_json()
    collaboration_id = client_data["collaborationId"]
    collaboration = Collaboration.query \
        .filter(Collaboration.id == collaboration_id).one()

    admin_members = list(
        filter(lambda membership: membership.role == "admin", collaboration.collaboration_memberships))
    admin_emails = list(map(lambda membership: membership.user.email, admin_members))

    # We need to delete other outstanding join_request for the same collaboration and user
    user_id = session["user"]["id"]
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
    return join_request, 201


@join_request_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_join_request():
    join_request_id = current_request.get_json()["id"]
    join_request = _get_join_request(join_request_id)
    collaboration = join_request.collaboration

    confirm_collaboration_admin(collaboration.id)

    user_id = join_request.user.id
    if collaboration.is_member(user_id):
        raise Conflict(f"User {join_request.user.name} is already a member of {collaboration.name}")

    mail_accepted_declined_join_request({"salutation": f"Dear {join_request.user.name}",
                                         "base_url": current_app.app_config.base_url,
                                         "administrator": session["user"]["name"],
                                         "join_request": join_request},
                                        join_request,
                                        True,
                                        [join_request.user.email])

    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration=collaboration,
                                                       role="member",
                                                       created_by=session["user"]["uid"])

    collaboration.collaboration_memberships.append(collaboration_membership)
    collaboration.join_requests.remove(join_request)
    db.session.commit()

    return None, 201


@join_request_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_join_request():
    join_request_id = current_request.get_json()["id"]
    join_request = _get_join_request(join_request_id)

    confirm_collaboration_admin(join_request.collaboration.id)

    mail_accepted_declined_join_request({"salutation": f"Dear {join_request.user.name}",
                                         "base_url": current_app.app_config.base_url,
                                         "administrator": session["user"]["name"],
                                         "join_request": join_request},
                                        join_request,
                                        False,
                                        [join_request.user.email])

    db.session.delete(join_request)
    db.session.commit()

    return None, 201


@join_request_api.route("/<join_request_id>", strict_slashes=False)
@json_endpoint
def join_request_by_id(join_request_id):
    confirm_write_access(join_request_id, override_func=_ensure_access_to_join_request)
    join_request = _get_join_request(join_request_id)
    return join_request, 200


@join_request_api.route("/<join_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_join_request(join_request_id):
    confirm_write_access(join_request_id, override_func=_ensure_access_to_join_request)
    return delete(JoinRequest, join_request_id)
