from flask import request as current_request
from werkzeug.exceptions import Unauthorized

from server.auth.security import secure_hash
from server.db.domain import Service


def get_authorization_header(is_external_api_url, ignore_missing_auth_header=False):
    authorization_header = current_request.headers.get("Authorization")
    is_authorized_api_key = authorization_header and authorization_header.lower().startswith("bearer")
    if not ignore_missing_auth_header and (not is_authorized_api_key or not is_external_api_url):
        raise Unauthorized(description="Invalid username or password")
    hashed_secret = secure_hash(authorization_header[len('bearer '):])
    return hashed_secret


def validate_service_token(attr_enabled):
    hashed_bearer_token = get_authorization_header(True)
    service = Service.query.filter(Service.hashed_token == hashed_bearer_token).first()
    if not service or not getattr(service, attr_enabled):
        raise Unauthorized()
    return service
