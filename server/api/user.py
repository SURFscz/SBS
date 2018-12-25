import json
import logging

from flask import Blueprint, request as current_request, session, current_app

from server.api.base import json_endpoint
from server.db.db import User
from server.db.models import update, save
from server.mail import collaboration_invite

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    sub = current_request.headers.get("Oidc-Claim-Sub")
    # TODO read more headers
    if sub:
        user = {"uid": sub, "name": "John Doe", "email": "john@example.org", "organization": "University Groningen",
                "guest": False}
        session["user"] = user
        return user, 200

    if "user" in session:
        return session["user"], 200

    if current_app.app_config.profile == "local":
        user = {"uid": "uid", "name": "John Doe", "email": "john@example.org", "organization": "University Groningen",
                "guest": False}
        session["user"] = user
        return user, 200

    user = {"uid": "anonymous", "guest": True}
    session["user"] = user
    return user, 200


@user_api.route("/<user_id>", strict_slashes=False)
@json_endpoint
def user_by_id(user_id):
    # options(joinedload("instances"))
    user = User.query.get(user_id)
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
    collaboration_invite({"salutation": "Dear John"}, "test", ["test@example.com"])
    return {}, 201


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
