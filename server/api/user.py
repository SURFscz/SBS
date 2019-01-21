import json
import logging
import os
from flask import Blueprint, request as current_request, session, current_app
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint, is_admin_user
from server.db.db import User, OrganisationMembership, CollaborationMembership, db
from server.db.models import update, save

UID_HEADER_NAME = "MELLON_cmuid"

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    # Temp code
    headers = current_request.headers
    for k, v in headers.items():
        current_app.logger.info(f"Header {k} value {v}")
    for k, v in os.environ.items():
        current_app.logger.info(f"OS environ {k} value {v}")

    if "user" in session and not session["user"]["guest"]:
        return session["user"], 200

    uid = current_request.headers.get(UID_HEADER_NAME)
    if uid:
        user = User.query.filter(User.uid == uid).first()
        if user:
            user = _user_to_session_object(user)
        else:
            user = User(uid=uid, name="todo", email="todo", created_by="system", updated_by="system")
            user = db.session.merge(user)
            db.session.commit()

            user = _user_to_session_object(user)
    else:
        user = {"uid": "anonymous", "guest": True, "admin": False}
    session["user"] = user
    return user, 200


def _user_to_session_object(user):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    return {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "guest": False,
        "admin": is_admin_user(user)
    }


def _user_query():
    return User.query \
        .outerjoin(User.organisation_memberships) \
        .outerjoin(OrganisationMembership.organisation) \
        .outerjoin(User.collaboration_memberships) \
        .outerjoin(CollaborationMembership.collaboration) \
        .options(contains_eager(User.organisation_memberships)
                 .contains_eager(OrganisationMembership.organisation)) \
        .options(contains_eager(User.collaboration_memberships)
                 .contains_eager(CollaborationMembership.collaboration))


@user_api.route("/<user_id>", strict_slashes=False)
@json_endpoint
def user_by_id(user_id):
    user = _user_query().filter(User.id == user_id).one()
    for cm in user.collaboration_memberships:
        for usc in cm.user_service_profiles:
            usc.service
    return user, 200


@user_api.route("/find_by_uid", strict_slashes=False)
@json_endpoint
def user_by_uid():
    uid = current_request.args.get("uid")
    user = _user_query() \
        .outerjoin(User.join_requests) \
        .options(contains_eager(User.join_requests)) \
        .filter(User.uid == uid).one()
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


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
