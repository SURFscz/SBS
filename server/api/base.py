# -*- coding: future_fstrings -*-
import json
import os
import re
import traceback
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse

from flask import Blueprint, jsonify, current_app, request as current_request, session, g as request_context
from jsonschema import ValidationError
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest, Forbidden

from server.auth.security import current_user_id, CSRF_TOKEN
from server.auth.tokens import get_authorization_header
from server.auth.urls import white_listing, mfa_listing, external_api_listing
from server.db.db import db
from server.db.domain import ApiKey, User
from server.logger.context_logger import ctx_logger
from server.mail import mail_error

base_api = Blueprint("base_api", __name__, url_prefix="/")

STATUS_OPEN = "open"
STATUS_DENIED = "denied"
STATUS_APPROVED = "approved"

_audit_trail_methods = ["PUT", "POST", "DELETE"]


def auth_filter(app_config):
    url = current_request.base_url
    oidc_config = current_app.app_config.oidc

    url_path = urlparse(url).path
    is_whitelisted_url = False

    if url_path in white_listing or url_path.startswith("/pam-weblogin"):
        is_whitelisted_url = True
        session["destination_url"] = url

    if "user" in session and "admin" in session["user"] and session["user"]["admin"]:
        request_context.is_authorized_api_call = False
        # Mixed situation where user session cookie and swagger API call
        if current_app.app_config.feature.sbs_swagger_enabled and current_request.headers.get("Authorization"):
            hashed_secret = get_authorization_header(True, ignore_missing_auth_header=True)
            api_key = ApiKey.query.filter(ApiKey.hashed_secret == hashed_secret).first()
            request_context.external_api_organisation = api_key.organisation if api_key else None
            return

    if "user" in session and not session["user"].get("guest"):
        if not session["user"].get("user_accepted_aup") and "api/aup/agree" not in url and not is_whitelisted_url:
            raise Unauthorized(description="AUP not accepted")
        if current_request.method in _audit_trail_methods:
            csrf_token_client = current_request.headers.get(CSRF_TOKEN)
            csrf_token_server = session.get(CSRF_TOKEN)
            prod_mode = not os.environ.get("TESTING")
            csrf_valid = csrf_token_client and csrf_token_server and csrf_token_client == csrf_token_server
            if prod_mode and not csrf_valid and url_path != "/api/mock":
                raise Unauthorized(description="Invalid CSRFToken")
        if "api/aup/agree" in url or "api/users/refresh" in url:
            return
        if not oidc_config.second_factor_authentication_required or session["user"].get("second_factor_confirmed"):
            request_context.is_authorized_api_call = False
            return
        elif url_path in mfa_listing:
            return

    is_external_api_url = False
    for u in external_api_listing:
        if url_path.startswith(u):
            is_external_api_url = True

    auth = current_request.authorization
    is_authorized_api_call = bool(auth and len(get_user(app_config, auth)) > 0)

    if not (is_whitelisted_url or is_authorized_api_call):
        hashed_secret = get_authorization_header(is_external_api_url)
        api_key = ApiKey.query.filter(ApiKey.hashed_secret == hashed_secret).first()
        if not api_key:
            raise Unauthorized(description="Invalid API key")
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


def _audit_trail():
    method = current_request.method
    if method in _audit_trail_methods:
        # Prevent logo base64 logging
        body = current_request.json if method != "DELETE" and current_request.is_json else {}
        if isinstance(body, dict):
            body.pop("logo", None)
        ctx_logger("base").info(f"Path {current_request.path} {method} {json.dumps(body, default=str)}")


def send_error_mail(tb):
    mail_conf = current_app.app_config.mail
    if mail_conf.send_exceptions and not os.environ.get("TESTING"):
        if "user" in session and "id" in session["user"]:
            user_id = User.query.get(current_user_id()).email
        elif request_context.get("is_authorized_api_call"):
            user_id = request_context.api_user.name
        elif request_context.get("external_api_organisation"):
            user_id = f"Organisation API call {request_context.get('external_api_organisation').name}"
        else:
            user_id = "unknown"
        mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, tb)


def json_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            auth_filter(current_app.app_config)
            session.permanent = True
            session.modified = False
            # This will mark the session modified again if something is stored like TOTP secret
            body, status = f(*args, **kwargs)
            response = jsonify(body)
            _audit_trail()
            _add_custom_header(response)
            db.session.commit()
            return response, status
        except Exception as e:
            if isinstance(e, Forbidden) and "You don't have the permission" in e.description:
                e.description = f"Forbidden 403: {current_request.url}. IP: {current_request.remote_addr}"
            elif isinstance(e, Unauthorized) and "The server could not verify" in e.description:
                e.description = f"Unauthorized 401: {current_request.url}. IP: {current_request.remote_addr}"
            elif hasattr(e, "description"):
                e.description = f"{e.__class__.__name__}: {current_request.url}." \
                                f" IP: {current_request.remote_addr}. " + e.description
            response = jsonify(message=e.description if isinstance(e, HTTPException) else str(e),
                               error=True)
            response.status_code = 500
            if isinstance(e, NoResultFound):
                response.status_code = 404
            elif isinstance(e, HTTPException):
                response.status_code = e.code
            elif isinstance(e, ValidationError):
                response.status_code = 400
            _add_custom_header(response)
            db.session.rollback()
            # We want to send emails if the exception is unexpected and validation errors should not happen server-side
            ctx_logger("base").exception(response)
            if response.status_code == 500 or response.status_code == 400:
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
    cfq = cfg.collaboration_suspension
    threshold_for_warning = cfq.collaboration_inactivity_days_threshold - cfq.inactivity_warning_mail_days_threshold
    return {"local": current_app.config["LOCAL"],
            "base_url": base_url,
            "api_keys_enabled": cfg.feature.api_keys_enabled,
            "feedback_enabled": cfg.feature.feedback_enabled,
            "seed_allowed": cfg.feature.seed_allowed,
            "organisation_categories": cfg.organisation_categories,
            "second_factor_authentication_required": cfg.oidc.second_factor_authentication_required,
            "impersonation_allowed": cfg.feature.impersonation_allowed,
            "ldap_url": cfg.ldap.url,
            "ldap_bind_account": cfg.ldap.bind_account,
            "continue_eduteams_redirect_uri": cfg.oidc.continue_eduteams_redirect_uri,
            "introspect_endpoint": f"{cfg.base_server_url}/api/tokens/introspect",
            "past_dates_allowed": cfg.feature.past_dates_allowed,
            "threshold_for_collaboration_inactivity_warning": threshold_for_warning
            }, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = Path(f"{os.path.dirname(os.path.realpath(__file__))}/git.info")
    if file.is_file():
        with open(str(file)) as f:
            return {"git": f.read()}, 200
    return {"git": "nope"}, 200
