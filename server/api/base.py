# -*- coding: future_fstrings -*-
import json
import os
import re
import traceback
from functools import wraps
from pathlib import Path

from flask import Blueprint, jsonify, current_app, request as current_request, session, g as request_context
from jsonschema import ValidationError
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest

from server.auth.security import secure_hash, current_user
from server.db.db import db
from server.db.domain import ApiKey
from server.logger.context_logger import ctx_logger
from server.mail import mail_error

base_api = Blueprint("base_api", __name__, url_prefix="/")

white_listing = ["health", "config", "info", "api/users/authorization", "api/aup", "api/users/resume-session",
                 "api/users/me",
                 "api/service_connection_requests/find_by_hash", "api/service_connection_requests/approve",
                 "/api/organisation_invitations/find_by_hash", "/api/invitations/find_by_hash",
                 "api/service_connection_requests/deny", "/api/mock", "/api/users/error"]
external_api_listing = ["api/collaborations/v1", "api/collaborations/v1/restricted",
                        "api/collaborations_services/v1/connect_collaboration_service",
                        "/api/invitations/v1/collaboration_invites"]

STATUS_OPEN = "open"
STATUS_DENIED = "denied"
STATUS_APPROVED = "approved"


def auth_filter(app_config):
    url = current_request.base_url

    if "user" in session and "guest" in session["user"] and not session["user"]["guest"]:
        request_context.is_authorized_api_call = False
        return

    is_whitelisted_url = False
    for u in white_listing:
        if u in url:
            is_whitelisted_url = True
            session["destination_url"] = url

    is_external_api_url = False
    for u in external_api_listing:
        if u in url:
            is_external_api_url = True

    auth = current_request.authorization
    is_authorized_api_call = bool(auth and len(get_user(app_config, auth)) > 0)

    if not (is_whitelisted_url or is_authorized_api_call):
        authorization_header = current_request.headers.get("Authorization")
        is_authorized_api_key = authorization_header and authorization_header.lower().startswith("bearer")
        if not is_authorized_api_key or not is_external_api_url:
            raise Unauthorized(description="Invalid username or password")

        hashed_secret = secure_hash(authorization_header[len('bearer '):])
        api_key = ApiKey.query.filter(ApiKey.hashed_secret == hashed_secret).one()
        request_context.external_api_organisation = api_key.organisation

    request_context.is_authorized_api_call = is_authorized_api_call
    if is_authorized_api_call:
        request_context.api_user = get_user(app_config, auth)[0]


def query_param(key, required=True, default=None):
    value = current_request.args.get(key, default=default)
    if required and value is None:
        raise BadRequest(f"Query parameter {key} is required, but missing")
    return value


def replace_full_text_search_boolean_mode_chars(input_param):
    return re.sub("[\\W]", " ", input_param)


def get_user(app_config, auth):
    return list(
        filter(lambda user: user.name == auth.username and user.password == auth.password, app_config.api_users))


def _add_custom_header(response):
    response.headers.set("x-session-alive", "true")
    response.headers["server"] = ""


_audit_trail_methods = ["PUT", "POST", "DELETE"]


def _audit_trail():
    method = current_request.method
    if method in _audit_trail_methods:
        # Prevent logo base64 logging
        body = current_request.json if method != "DELETE" else {}
        body.pop("logo", None)
        ctx_logger("base").info(f"Path {current_request.path} {method} {json.dumps(body)}")


def _service_status(body):
    if current_app.app_config.service_bus.enabled:
        method = current_request.method
        path = current_request.path
        endpoint = path.rsplit('/', 1)[-1]
        if method in _audit_trail_methods and endpoint != 'error':
            msg = jsonify(body).get_data() if isinstance(body, db.Model) else json.dumps(body)
            method = method.lower()
            topic = f"sbs{path}/{method}"
            current_app.mqtt.publish(topic, msg)


def send_error_mail(tb, session_exists=True):
    mail_conf = current_app.app_config.mail
    if mail_conf.send_exceptions and not os.environ.get("TESTING"):
        user = current_user() if session_exists else {}
        user_id = user.get("email", user.get("name")) if "email" in user or "name" in user \
            else request_context.api_user.name if request_context.is_authorized_api_call else "unknown"
        mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, tb)


def json_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            session.modified = True
            auth_filter(current_app.app_config)
            body, status = f(*args, **kwargs)
            response = jsonify(body)
            _audit_trail()
            _add_custom_header(response)
            db.session.commit()
            _service_status(body)
            return response, status
        except Exception as e:
            response = jsonify(message=e.description if isinstance(e, HTTPException) else str(e),
                               error=True)
            response.status_code = 500
            ctx_logger("base").exception(response)
            if isinstance(e, NoResultFound):
                response.status_code = 404
            elif isinstance(e, HTTPException):
                response.status_code = e.code
            elif isinstance(e, ValidationError):
                response.status_code = 400
            _add_custom_header(response)
            db.session.rollback()
            send_error_mail(tb=traceback.format_exc())
            return response

    return wrapper


@base_api.route("/health", strict_slashes=False)
@json_endpoint
def health():
    return {"status": "UP"}, 200


@base_api.route("/config", strict_slashes=False)
@json_endpoint
def config():
    cfg = current_app.app_config
    base_url = cfg.base_url
    base_url = base_url[:-1] if base_url.endswith("/") else base_url
    return {"local": current_app.config["LOCAL"],
            "base_url": base_url,
            "admin_users_upgrade": cfg.feature.admin_users_upgrade,
            "api_keys_enabled": cfg.feature.api_keys_enabled,
            "feedback_enabled": cfg.feature.feedback_enabled,
            "seed_allowed": cfg.feature.seed_allowed,
            "organisation_categories": cfg.organisation_categories,
            "admin_users_upgrade_url": cfg.feature.admin_users_upgrade_url}, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = Path(f"{os.path.dirname(os.path.realpath(__file__))}/git.info")
    if file.is_file():
        with open(str(file)) as f:
            return {"git": f.read()}, 200
    return {"git": "nope"}, 200
