from flask import request as current_request, g as request_context, current_app
from werkzeug.exceptions import Unauthorized, BadRequest

from server.auth.secrets import secure_hash, encrypt_secret, decrypt_secret
from server.db.db import db
from server.db.domain import Service, ServiceToken
from server.logger.context_logger import ctx_logger


def _service_context(service: Service):
    return {"scim_url": service.scim_url, "identifier": service.id, "table_name": "services"}


def _get_encryption_key(service: Service):
    if not service.scim_bearer_token or not service.scim_url:
        raise BadRequest("encrypt_scim_bearer_token requires scim_bearer_token and scim_url")
    encryption_key = current_app.app_config.encryption_key
    return encryption_key


def get_authorization_header(is_external_api_url, ignore_missing_auth_header=False):
    authorization_header = current_request.headers.get("Authorization")
    is_authorized_api_key = authorization_header and authorization_header.lower().startswith("bearer")
    if not ignore_missing_auth_header and (not is_authorized_api_key or not is_external_api_url):
        raise Unauthorized(description="Invalid username or password")
    hashed_secret = secure_hash(authorization_header[len('bearer '):])
    return hashed_secret


def validate_service_token(attr_enabled, token_type) -> Service:
    hashed_bearer_token = get_authorization_header(True)
    service = Service.query \
        .join(Service.service_tokens) \
        .filter(ServiceToken.hashed_token == hashed_bearer_token) \
        .filter(ServiceToken.token_type == token_type) \
        .first()
    if not service or (attr_enabled and not getattr(service, attr_enabled)):
        logger = ctx_logger("validate_service_token")
        has_json = current_request.method != "DELETE" and current_request.method != "GET"
        body = current_request.json if has_json and current_request.is_json else current_request.headers
        logger.warning(f"Invalid service_token: {body}")
        raise Unauthorized()
    request_context.service_token = f"Service token {service.name}"
    return service


def encrypt_scim_bearer_token(service: Service):
    encryption_key = _get_encryption_key(service)
    encrypted_bearer_token = encrypt_secret(encryption_key, service.scim_bearer_token, _service_context(service))
    service.scim_bearer_token = encrypted_bearer_token
    db.session.merge(service)


def decrypt_scim_bearer_token(service: Service):
    encryption_key = _get_encryption_key(service)
    return decrypt_secret(encryption_key, service.scim_bearer_token, _service_context(service))
