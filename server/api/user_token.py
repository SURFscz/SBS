# -*- coding: future_fstrings -*-
from secrets import token_urlsafe
import datetime
from flask import Blueprint, request as current_request
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint
from server.api.service import user_service
from server.auth.security import hash_secret_key, current_user_id
from server.db.db import db
from server.db.domain import UserToken, User, Service
from server.db.models import save, delete

user_token_api = Blueprint("user_token_api", __name__, url_prefix="/api/user_tokens")


def _sanitize_and_verify(hash_token=True):
    data = current_request.get_json()
    if data["user_id"] != current_user_id():
        raise Forbidden("Can not create user_token for someone else")
    if hash_token:
        data = hash_secret_key(data, "hashed_token")

    service_id = data["service_id"]
    service = Service.query.get(service_id)

    if not user_service(service_id):
        raise Forbidden(f"User has no access to  {service.name}")
    if not service.token_enabled:
        raise Forbidden(f"Can not create user_token for service {service.name}")

    return data


@user_token_api.route("/", strict_slashes=False)
@json_endpoint
def user_tokens():
    user = User.query.get(current_user_id())
    return user.user_tokens, 200


@user_token_api.route("/generate_token", strict_slashes=False)
@json_endpoint
def generate_token():
    return {"value": token_urlsafe()}, 200


@user_token_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_token():
    data = _sanitize_and_verify()
    return save(UserToken, custom_json=data)


@user_token_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_token():
    data = _sanitize_and_verify(hash_token=False)
    user_token = UserToken.query.get(data["id"])
    user_token.name = data.get("name")
    user_token.description = data.get("description")
    return db.session.merge(user_token), 201


@user_token_api.route("/renew_lease", methods=["PUT"], strict_slashes=False)
@json_endpoint
def renew_lease():
    data = _sanitize_and_verify(hash_token=False)
    user_token = UserToken.query.get(data["id"])
    user_token.created_at = datetime.datetime.utcnow()
    return db.session.merge(user_token), 201


@user_token_api.route("/<user_token_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_api_key(user_token_id):
    user_token = UserToken.query.get(user_token_id)
    if current_user_id() != user_token.user_id:
        raise Forbidden("Can not delete user_token from someone else")
    return delete(UserToken, user_token_id)
