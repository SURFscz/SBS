# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.secrets import generate_token, hash_secret_key
from server.auth.security import confirm_service_admin
from server.db.domain import ServiceToken
from server.db.models import save, delete

service_token_api = Blueprint("service_token_api", __name__, url_prefix="/api/service_tokens")


@service_token_api.route("/", strict_slashes=False)
@json_endpoint
def generate_service_token():
    return {"value": generate_token()}, 200


@service_token_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service_token():
    data = current_request.get_json()
    confirm_service_admin(data["service_id"])
    data = hash_secret_key(data, "hashed_token")
    return save(ServiceToken, custom_json=data)


@service_token_api.route("/<service_token_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_token(service_token_id):
    service_id = ServiceToken.query.get(service_token_id).service_id
    confirm_service_admin(service_id)
    return delete(ServiceToken, service_token_id)
