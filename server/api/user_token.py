import datetime

from flask import Blueprint, jsonify, request as current_request, session
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.service import user_service
from server.auth.secrets import generate_token, hash_secret_key
from server.auth.security import current_user_id
from server.db.db import db
from server.db.domain import UserToken, User, Service
from server.db.models import save, delete

user_token_api = Blueprint("user_token_api", __name__, url_prefix="/api/user_tokens")


def _sanitize_and_verify(data, hash_token=True):
    if data["user_id"] != current_user_id():
        raise Forbidden("Can not create user_token for someone else")
    if hash_token:
        data = hash_secret_key(data, "hashed_token")

    service_id = data["service_id"]
    service = db.session.get(Service, service_id)

    if not user_service(service_id, False):
        raise Forbidden(f"User has no access to {service.name}")
    if not service.token_enabled:
        raise Forbidden(f"Can not create user_token for service {service.name}")

    return data


@user_token_api.route("/", strict_slashes=False)
@json_endpoint
def user_tokens():
    user = db.session.get(User, current_user_id())
    tokens = user.user_tokens
    service_id = query_param("service_id", False)
    if service_id:
        tokens = [token for token in tokens if token.service_id == int(service_id)]
    tokens = jsonify(tokens).json
    for token in tokens:
        del token["hashed_token"]
    return tokens, 200


@user_token_api.route("/generate_token", strict_slashes=False)
@json_endpoint
def generate_random_token():
    generated_token = generate_token()
    session["generated_token"] = generated_token
    return {"value": generated_token}, 200


@user_token_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_token():
    data = current_request.get_json()
    generated_token = session.get("generated_token")
    if not generated_token or generated_token != data["hashed_token"]:
        raise Forbidden("Tampering with generated token is not allowed")
    data["hashed_token"] = generated_token
    data = _sanitize_and_verify(data)
    del session["generated_token"]

    emit_socket(f"service_{data['service_id']}")

    return save(UserToken, custom_json=data)


@user_token_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_token():
    data = _sanitize_and_verify(current_request.get_json(), hash_token=False)
    user_token = db.session.get(UserToken, data["id"])
    service_id = data["service_id"]
    user_token.service = db.session.get(Service, service_id)
    user_token.name = data.get("name")
    user_token.description = data.get("description")
    db.session.merge(user_token)

    emit_socket(f"service_{service_id}")

    return {}, 201


@user_token_api.route("/renew_lease", methods=["PUT"], strict_slashes=False)
@json_endpoint
def renew_lease():
    data = _sanitize_and_verify(current_request.get_json(), hash_token=False)
    user_token = db.session.get(UserToken, data["id"])
    user_token.created_at = datetime.datetime.utcnow()
    db.session.merge(user_token)
    return {}, 201


@user_token_api.route("/<user_token_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_api_key(user_token_id):
    user_token = db.session.get(UserToken, user_token_id)
    if current_user_id() != user_token.user_id:
        raise Forbidden("Can not delete user_token from someone else")

    emit_socket(f"service_{user_token.service_id}")

    return delete(UserToken, user_token_id)
