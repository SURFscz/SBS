# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from flask import Blueprint, request as current_request
from werkzeug.exceptions import SecurityError

from server.api.base import json_endpoint
from server.auth.security import confirm_organisation_admin, secure_hash
from server.db.db import ApiKey
from server.db.models import update, save, delete

MIN_SECRET_LENGT = 43

api_key_api = Blueprint("api_key_api", __name__, url_prefix="/api/api_keys")


def _check_organisation_admin(data):
    organisation_id = data["organisation_id"]
    confirm_organisation_admin(organisation_id)


def _hash_secret_key():
    data = current_request.get_json()
    _check_organisation_admin(data)
    secret = data["hashed_secret"]
    if len(secret) < MIN_SECRET_LENGT:
        raise SecurityError(f"minimal length of secret for API key is {MIN_SECRET_LENGT}")
    data["hashed_secret"] = secure_hash(secret)
    return data


@api_key_api.route("/", strict_slashes=False)
@json_endpoint
def generate_key():
    return {"value": token_urlsafe()}, 200


@api_key_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_api_key():
    data = _hash_secret_key()
    return save(ApiKey, custom_json=data)


@api_key_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def reset_api_key():
    data = _hash_secret_key()
    return update(ApiKey, custom_json=data, allow_child_cascades=False)


@api_key_api.route("/<api_key_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_api_key(api_key_id):
    organisation_id = ApiKey.query.get(api_key_id).organisation_id
    _check_organisation_admin({"organisation_id": organisation_id})
    return delete(ApiKey, api_key_id)
