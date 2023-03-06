from flask import request as current_request, g as request_context
from werkzeug.exceptions import Unauthorized

from server.auth.secrets import secure_hash
from server.db.domain import Service, ServiceToken
from server.logger.context_logger import ctx_logger


def get_authorization_header(is_external_api_url, ignore_missing_auth_header=False):
    authorization_header = current_request.headers.get("Authorization")
    is_authorized_api_key = authorization_header and authorization_header.lower().startswith("bearer")
    if not ignore_missing_auth_header and (not is_authorized_api_key or not is_external_api_url):
        raise Unauthorized(description="Invalid username or password")
    hashed_secret = secure_hash(authorization_header[len('bearer '):])
    return hashed_secret


def validate_service_token(attr_enabled) -> Service:
    hashed_bearer_token = get_authorization_header(True)
    service = Service.query \
        .join(Service.service_tokens) \
        .filter(ServiceToken.hashed_token == hashed_bearer_token) \
        .first()
    if not service or (attr_enabled and not getattr(service, attr_enabled)):
        logger = ctx_logger("validate_service_token")
        has_json = current_request.method != "DELETE" and current_request.method != "GET"
        body = current_request.json if has_json and current_request.is_json else current_request.headers
        logger.warning(f"Invalid service_token: {body}")
        raise Unauthorized()
    request_context.service_token = f"Service token {service.name}"
    return service
