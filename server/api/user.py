import json
import logging
import os

from flask import Blueprint, request as current_request, session, current_app, jsonify
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.db.db import User, OrganisationMembership, CollaborationMembership, db

UID_HEADER_NAME = "MELLON_cmuid"

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


# Temp code
def _log_headers():
    headers = current_request.headers
    for k, v in headers.items():
        current_app.logger.info(f"Header {k} value {v}")
    for k, v in os.environ.items():
        current_app.logger.info(f"OS environ {k} value {v}")


def _is_admin_user(uid):
    return len(list(filter(lambda u: u.uid == uid, current_app.app_config.admin_users))) == 1


def _store_user_in_session(user):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    is_admin = {"admin": _is_admin_user(user.uid), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email
    }
    session["user"] = {**session_data, **is_admin}
    return is_admin


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


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    _log_headers()

    uid = current_request.headers.get(UID_HEADER_NAME)
    if uid:
        users = _user_query().filter(User.uid == uid).all()
        user = users[0] if len(users) > 0 else None
        if not user:
            user = User(uid=uid, name="todo", email="todo", created_by="system", updated_by="system")
            user = db.session.merge(user)
            db.session.commit()

        is_admin = _store_user_in_session(user)
        json_user = jsonify(user).json
        user = {**json_user, **is_admin}
    else:
        user = {"uid": "anonymous", "guest": True, "admin": False}
        session["user"] = user
    return user, 200


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
