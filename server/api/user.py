import json
import logging

from flask import Blueprint, request as current_request, current_app, session
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.db.db import User, OrganisationMembership, CollaborationMembership, Collaboration, JoinRequest, db
from server.db.models import update, save
from server.mail import collaboration_join_request

UID_HEADER_NAME = "MELLON_cmuid"

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    if "user" in session and not session["user"]["guest"]:
        return session["user"], 200

    uid = current_request.headers.get(UID_HEADER_NAME)
    if uid:
        users = User.query.filter(User.uid == uid).all()
        if len(users) > 0:
            user = _user_to_session_object(users[0])
        else:
            user = User(uid=uid, name="todo", email="todo", created_by="system", updated_by="system")
            user = db.session.merge(user)
            db.session.commit()

            user = _user_to_session_object(user)
    else:
        user = {"uid": "anonymous", "guest": True}
    session["user"] = user
    return user, 200


def _user_to_session_object(user):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    return {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "guest": False
    }


def _user_query():
    return User.query \
        .options(joinedload(User.organisation_memberships).subqueryload(OrganisationMembership.organisation)) \
        .options(joinedload(User.collaboration_memberships).subqueryload(CollaborationMembership.collaboration))


@user_api.route("/<user_id>", strict_slashes=False)
@json_endpoint
def user_by_id(user_id):
    user = _user_query().get(user_id)
    if not user:
        return None, 404
    for cm in user.collaboration_memberships:
        for usc in cm.user_service_profiles:
            usc.service
    return user, 200


@user_api.route("/find_by_uid", strict_slashes=False)
@json_endpoint
def user_by_uid():
    uid = current_request.args.get("uid")
    user = _user_query().filter(User.uid == uid).one()
    for cm in user.collaboration_memberships:
        for usc in cm.user_service_profiles:
            usc.service
    return (user, 200) if user else (None, 404)


@user_api.route("/", strict_slashes=False)
@json_endpoint
def all_users():
    return User.query.all(), 200


@user_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_user():
    return save(User)


@user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user():
    return update(User)


@user_api.route("/send_invitation", methods=["POST"], strict_slashes=False)
@json_endpoint
def send_invitation():
    client_data = current_request.get_json()
    collaboration = Collaboration.query.join(Collaboration.services).filter(
        Collaboration.id == client_data["collaborationId"]).one()
    admin_members = list(
        filter(lambda membership: membership.role == "admin", collaboration.collaboration_memberships))
    admin_emails = list(map(lambda membership: membership.user.email, admin_members))
    join_request = JoinRequest(message=client_data["motivation"],
                               reference=client_data["reference"],
                               user_id=session["user"]["id"],
                               collaboration=collaboration)
    join_request = db.session.merge(join_request)
    db.session.commit()

    # create JoinRequest and implement back-end to approve - deny this JoinRequest
    collaboration_join_request({
        "salutation": "Dear",
        "collaboration": collaboration,
        "user": session["user"],
        "base_url": current_app.app_config.base_url,
        "join_request": join_request
    }, collaboration, admin_emails)
    return {}, 201


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
