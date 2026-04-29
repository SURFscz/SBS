from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.ssh_validator import is_valid_ssh_public_key

ssh_api = Blueprint("ssh_api", __name__, url_prefix="/api/ssh")


@ssh_api.route("/validate", methods=["POST"], strict_slashes=False)
@json_endpoint
def validate():
    data = current_request.get_json()
    ssh_public_key = data["ssh"]
    is_valid = is_valid_ssh_public_key(ssh_public_key)
    return {"valid": is_valid}, 200
