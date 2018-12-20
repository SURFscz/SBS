import json
import logging

from flask import Blueprint, request as current_request, session, current_app

from server.api.base import json_endpoint
from server.db.db import User, db

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    sub = current_request.headers.get("Oidc-Claim-Sub")
    if sub:
        user = {"uid": sub, "guest": False}
        session["user"] = user
        return user, 200

    if "user" in session:
        return session["user"], 200

    if current_app.app_config.profile == "local":
        user = {"uid": "uid", "display_name": "John Doe", "guest": False}
        session["user"] = user
        return user, 200

    user = {"uid": "anonymous", "guest": True}
    session["user"] = user
    return user, 200


@user_api.route("/", strict_slashes=False)
@json_endpoint
def users():
    return User.query.all(), 200


@user_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create():
    json_dict = current_request.get_json()
    user = User(**json_dict)
    db.session.merge(user)
    db.session.commit()
    return user, 201


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
