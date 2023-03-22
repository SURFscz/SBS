from flask import Blueprint, request as current_request, session
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, emit_socket
from server.auth.secrets import generate_token, hash_secret_key
from server.auth.security import confirm_service_admin
from server.db.db import db
from server.db.defaults import service_token_options, SERVICE_TOKEN_INTROSPECTION
from server.db.domain import ServiceToken, Service
from server.db.models import save, delete

service_token_api = Blueprint("service_token_api", __name__, url_prefix="/api/service_tokens")


@service_token_api.route("/", strict_slashes=False)
@json_endpoint
def generate_service_token():
    hashed_token = generate_token()
    session["hashed_token"] = hashed_token
    return {"value": hashed_token}, 200


@service_token_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service_token():
    data = current_request.get_json()
    confirm_service_admin(data["service_id"])
    hashed_token = session.get("hashed_token")
    if not hashed_token or hashed_token != data["hashed_token"]:
        raise Forbidden("Tampering with generated hashed_token is not allowed")
    data = hash_secret_key(data, "hashed_token")
    service = Service.query.get(data["service_id"])
    token_type = data.get("token_type")
    if token_type not in list(service_token_options.values()):
        raise Forbidden(f"Invalid token_type {token_type}")

    for enabled, type in service_token_options.items():
        if token_type == type and not getattr(service, enabled):
            setattr(service, enabled, True)
            if type == SERVICE_TOKEN_INTROSPECTION and not service.token_validity_days:
                service.token_validity_days = data.get("token_validity_days", 1)
            db.session.merge(service)

    emit_socket(f"service_{service.id}")

    return save(ServiceToken, custom_json=data)


@service_token_api.route("/<service_token_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_token(service_token_id):
    service_id = ServiceToken.query.get(service_token_id).service_id
    confirm_service_admin(service_id)

    emit_socket(f"service_{service_id}")

    return delete(ServiceToken, service_token_id)
