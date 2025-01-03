from flask import Blueprint, request as current_request, session
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint
from server.auth.secrets import generate_token, hash_secret_key
from server.auth.security import confirm_organisation_admin
from server.db.db import db
from server.db.domain import ApiKey
from server.db.models import save, delete

api_key_api = Blueprint("api_key_api", __name__, url_prefix="/api/api_keys")


@api_key_api.route("/", strict_slashes=False)
@json_endpoint
def generate_key():
    hashed_secret = generate_token()
    session["hashed_secret"] = hashed_secret
    return {"value": hashed_secret}, 200


@api_key_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_api_key():
    data = current_request.get_json()
    confirm_organisation_admin(data["organisation_id"])
    hashed_secret = session.get("hashed_secret")
    if not hashed_secret or hashed_secret != data["hashed_secret"]:
        raise Forbidden("Tampering with generated api secret is not allowed")
    data = hash_secret_key(data)
    return save(ApiKey, custom_json=data, allowed_child_collections=["units"])


@api_key_api.route("/<api_key_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_api_key(api_key_id):
    organisation_id = db.session.get(ApiKey, api_key_id).organisation_id
    confirm_organisation_admin(organisation_id)
    return delete(ApiKey, api_key_id)
