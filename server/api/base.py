# -*- coding: future_fstrings -*-
import datetime
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
from server.auth.urls import white_listing, mfa_listing, external_api_listing
from server.auth.user_claims import user_memberships
from server.db.db import db
from server.db.domain import ApiKey, Service, UserToken
from server.logger.context_logger import ctx_logger
from server.mail import mail_error

base_api = Blueprint("base_api", __name__, url_prefix="/")

STATUS_OPEN = "open"
STATUS_DENIED = "denied"
STATUS_APPROVED = "approved"


def _get_authorization_header(is_external_api_url):
    authorization_header = current_request.headers.get("Authorization")
    is_authorized_api_key = authorization_header and authorization_header.lower().startswith("bearer")
    if not is_authorized_api_key or not is_external_api_url:
        raise Unauthorized(description="Invalid username or password")
    hashed_secret = secure_hash(authorization_header[len('bearer '):])
    return hashed_secret


def auth_filter(app_config):
    url = current_request.base_url
    oidc_config = current_app.app_config.oidc

    is_whitelisted_url = False
    for u in white_listing:
        if u in url:
            is_whitelisted_url = True
            session["destination_url"] = url

    if "user" in session and "admin" in session["user"] and session["user"]["admin"]:
        request_context.is_authorized_api_call = False
        return

    if "user" in session and not session["user"].get("guest"):
        if not session["user"].get("user_accepted_aup") and "api/aup/agree" not in url and not is_whitelisted_url:
            raise Unauthorized(description="AUP not accepted")
        if "api/aup/agree" in url or "api/users/refresh" in url:
            return
        if not oidc_config.second_factor_authentication_required or session["user"].get("second_factor_confirmed"):
            request_context.is_authorized_api_call = False
            return
        else:
            for u in mfa_listing:
                if u in url:
                    return

    is_external_api_url = False
    for u in external_api_listing:
        if u in url:
            is_external_api_url = True

    auth = current_request.authorization
    is_authorized_api_call = bool(auth and len(get_user(app_config, auth)) > 0)

    if not (is_whitelisted_url or is_authorized_api_call):
        hashed_secret = _get_authorization_header(is_external_api_url)
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


_audit_trail_methods = ["PUT", "POST", "DELETE"]


def _audit_trail():
    method = current_request.method
    if method in _audit_trail_methods:
        # Prevent logo base64 logging
        body = current_request.json if method != "DELETE" else {}
        if isinstance(body, dict):
            body.pop("logo", None)
        ctx_logger("base").info(f"Path {current_request.path} {method} {json.dumps(body, default=str)}")


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
            # We want to send emails if the exception is unexpected and validation errors should not happen server-side
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
    return {"local": current_app.config["LOCAL"],
            "base_url": base_url,
            "admin_users_upgrade": cfg.feature.admin_users_upgrade,
            "api_keys_enabled": cfg.feature.api_keys_enabled,
            "feedback_enabled": cfg.feature.feedback_enabled,
            "seed_allowed": cfg.feature.seed_allowed,
            "organisation_categories": cfg.organisation_categories,
            "second_factor_authentication_required": cfg.oidc.second_factor_authentication_required,
            "admin_users_upgrade_url": cfg.feature.admin_users_upgrade_url,
            "impersonation_allowed": cfg.feature.impersonation_allowed,
            "ldap_url": cfg.ldap.url,
            "ldap_bind_account": cfg.ldap.bind_account,
            "continue_eduteams_redirect_uri": cfg.oidc.continue_eduteams_redirect_uri,
            "introspect_endpoint": f"{cfg.base_server_url}/introspect"
            }, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = Path(f"{os.path.dirname(os.path.realpath(__file__))}/git.info")
    if file.is_file():
        with open(str(file)) as f:
            return {"git": f.read()}, 200
    return {"git": "nope"}, 200


@base_api.route("/introspect", methods=["POST"], strict_slashes=False)
@json_endpoint
def introspect():
    hashed_bearer_token = _get_authorization_header(True)
    service = Service.query.filter(Service.hashed_token == hashed_bearer_token).first()
    if not service or not service.token_enabled:
        raise Unauthorized()

    token = current_request.form.get("token")
    hashed_token = secure_hash(token)
    user_token = UserToken.query.filter(UserToken.hashed_token == hashed_token).first()
    if not user_token or user_token.service_id != service.id:
        return {"status": "token-unknown", "active": False}, 200

    current_time = datetime.datetime.utcnow()
    expiry_date = current_time - datetime.timedelta(days=service.token_validity_days)
    if user_token.created_at < expiry_date:
        return {"status": "token-expired", "active": False}, 200

    user = user_token.user
    if user.suspended:
        return {"status": "user-suspended", "active": False}, 200

    connected_collaborations = []
    memberships = []
    for cm in user.collaboration_memberships:
        connected = list(filter(lambda s: s.id == service.id, cm.collaboration.services))
        if connected or list(filter(lambda s: s.id == service.id, cm.collaboration.organisation.services)):
            connected_collaborations.append(cm.collaboration)
            memberships.append(cm)

    if not connected_collaborations or all(m.is_expired() for m in memberships):
        return {"status": "token-not-connected", "active": False}, 200

    user_token.last_used_date = current_time
    db.session.merge(user_token)

    epoch = int(current_time.timestamp())
    entitlements = user_memberships(user, connected_collaborations)
    result = {
        "active": True,
        "status": "token-valid",
        "client_id": service.entity_id,
        "sub": user.uid,
        "username": user.username,
        "iat": epoch,
        "exp": epoch + 5 * 60,
        "aud": service.entity_id,
        "iss": current_app.app_config.base_url,
        "user": {
            "name": user.name,
            "given_name": user.given_name,
            "familiy_name": user.family_name,
            "email": user.email,
            "sub": user.uid,
            "voperson_external_id": user.eduperson_principal_name,
            "voperson_external_affiliation": user.scoped_affiliation,
            "uid": user.uid,
            "username": user.username,
            "eduperson_entitlement ": list(entitlements)
        }
    }
    return result, 200
