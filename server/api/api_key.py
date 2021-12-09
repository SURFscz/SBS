# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import confirm_organisation_admin_or_manager, hash_secret_key
from server.db.domain import ApiKey
from server.db.models import save, delete

api_key_api = Blueprint("api_key_api", __name__, url_prefix="/api/api_keys")


@api_key_api.route("/", strict_slashes=False)
@json_endpoint
def generate_key():
    return {"value": token_urlsafe()}, 200


@api_key_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_api_key():
    data = current_request.get_json()
    confirm_organisation_admin_or_manager(data["organisation_id"])
    data = hash_secret_key(data)
    return save(ApiKey, custom_json=data)


@api_key_api.route("/<api_key_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_api_key(api_key_id):
    organisation_id = ApiKey.query.get(api_key_id).organisation_id
    confirm_organisation_admin_or_manager(organisation_id)
    return delete(ApiKey, api_key_id)
