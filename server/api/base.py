import inspect
import json
import logging
import os
import re
import traceback
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from flask import Blueprint, jsonify, current_app, request as current_request, session, g as request_context
from jsonschema import ValidationError
from redis.exceptions import ConnectionError
from sqlalchemy.exc import OperationalError, DatabaseError
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest, Forbidden, Conflict

from server.api.exceptions import APIBadRequest
from server.auth.security import current_user_id, CSRF_TOKEN
from server.auth.tokens import get_authorization_header
from server.auth.urls import noauth_listing, mfa_listing, external_api_listing
from server.db.db import db
from server.db.domain import ApiKey, User, SchacHomeOrganisation
from server.logger.context_logger import ctx_logger
from server.mail import mail_error

base_api = Blueprint("base_api", __name__, url_prefix="/")

_audit_trail_methods = ["PUT", "POST", "DELETE"]


def emit_socket(topic, include_current_user_id=False):
    subscription_id = current_request.cookies.get("subscription_id")
    data = {"subscription_id": subscription_id if subscription_id else str(uuid4())}
    if include_current_user_id:
        data["current_user_id"] = current_user_id()
    current_app.socket_io.emit(topic, data)


def auth_filter(app_config):
    url = current_request.base_url
    oidc_config = current_app.app_config.oidc

    url_path = urlparse(url).path
    url_is_on_allowlist = False

    if url_path in noauth_listing or url_path.startswith("/pam-weblogin") or url_path.startswith("/api/scim"):
        url_is_on_allowlist = True
        session["destination_url"] = url

    if "user" in session and "admin" in session["user"] and session["user"]["admin"]:
        request_context.is_authorized_api_call = False
        # Mixed situation where user session cookie and swagger API call
        if current_app.app_config.feature.sbs_swagger_enabled and current_request.headers.get("Authorization"):
            hashed_secret = get_authorization_header(True, ignore_missing_auth_header=True)
            api_key = ApiKey.query.filter(ApiKey.hashed_secret == hashed_secret).first()
            request_context.external_api_organisation = api_key.organisation if api_key else None
            # Too prevent sqlalchemy.orm.exc.DetachedInstanceError
            request_context.external_api_organisation_name = api_key.organisation.name if api_key else None
            request_context.external_api_key = api_key
            return

    if "user" in session and not session["user"].get("guest"):
        if not session["user"].get("user_accepted_aup") and "api/aup/agree" not in url and not url_is_on_allowlist:
            raise Unauthorized(description="AUP not accepted")
        if current_request.method in _audit_trail_methods and not url_is_on_allowlist:
            csrf_token_client = current_request.headers.get(CSRF_TOKEN)
            csrf_token_server = session.get(CSRF_TOKEN)
            prod_mode = not os.environ.get("TESTING")
            csrf_valid = csrf_token_client and csrf_token_server and csrf_token_client == csrf_token_server
            if prod_mode and not csrf_valid and url_path != "/api/mock":
                raise Unauthorized(description="Invalid CSRFToken")
        if "api/aup/agree" in url or "api/users/refresh" in url or "api/mfa/token_reset_request" in url:
            return
        mfa_required = oidc_config.second_factor_authentication_required
        mfa_confirmed = session["user"].get("second_factor_confirmed")
        is_feedback = "api/system/feedback" in url
        if not mfa_required or mfa_confirmed or is_feedback:
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

    if not (url_is_on_allowlist or is_authorized_api_call):
        hashed_secret = get_authorization_header(is_external_api_url)
        api_key = ApiKey.query.filter(ApiKey.hashed_secret == hashed_secret).first()
        if not api_key:
            raise Unauthorized(description="Invalid API key")
        request_context.external_api_organisation = api_key.organisation
        # Too prevent sqlalchemy.orm.exc.DetachedInstanceError
        request_context.external_api_organisation_name = api_key.organisation.name
        request_context.external_api_key = api_key
        logger = logging.getLogger("external_api")
        logger.info(f"Authorized API call for organisation {api_key.organisation.name} with key {api_key.description}")

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
    if mail_conf.send_exceptions:
        if "user" in session and "id" in session["user"]:
            user_id = db.session.get(User, current_user_id()).email
        elif request_context.get("is_authorized_api_call"):
            user_id = request_context.api_user.name
        elif request_context.get("external_api_organisation"):
            user_id = f"Organisation API call {request_context.get('external_api_organisation').name}"
        else:
            user_id = "unknown"
        mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, tb)


def organisation_by_user_schac_home(user_from_db=None):
    user = user_from_db if user_from_db else User.query.filter(User.id == current_user_id()).one()
    organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)

    entitlement = current_app.app_config.collaboration_creation_allowed_entitlement
    auto_aff = bool(user.entitlement) and entitlement in user.entitlement
    return [{"id": org.id,
             "name": org.name,
             "logo": org.logo,
             "collaboration_creation_allowed": org.collaboration_creation_allowed,
             "collaboration_creation_allowed_entitlement": auto_aff,
             "required_entitlement": entitlement,
             "user_entitlement": user.entitlement,
             "has_members": len(org.organisation_memberships) > 0,
             "on_boarding_msg": org.on_boarding_msg,
             "units": org.units,
             "schac_home_organisations": [sho.name for sho in org.schac_home_organisations],
             "short_name": org.short_name} for org in organisations]


def application_base_url():
    cfg = current_app.app_config
    base_url = cfg.base_url
    return base_url[:-1] if base_url.endswith("/") else base_url


def server_base_url():
    cfg = current_app.app_config
    base_server_url = cfg.base_server_url
    return base_server_url[:-1] if base_server_url.endswith("/") else base_server_url


def _remote_address():
    forwarded = current_request.headers.get("X-Forwarded-For", None)
    return forwarded if forwarded else current_request.remote_addr


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
            # Sneaky way to implement callback to add headers to the status
            if inspect.isfunction(status):
                status = status(response)
            _audit_trail()
            _add_custom_header(response)
            db.session.commit()
            return response, status
        except Exception as e:
            skip_email = False
            if isinstance(e, Forbidden) and "You don't have the permission" in e.description:
                e.description = f"Forbidden 403: {current_request.url}. IP: {_remote_address()}"
            elif isinstance(e, Unauthorized) and "The server could not verify" in e.description:
                e.description = f"Unauthorized 401: {current_request.url}. IP: {_remote_address()}"
            elif isinstance(e, APIBadRequest):
                skip_email = True
            elif isinstance(e, Conflict):
                skip_email = True
            elif hasattr(e, "description"):
                e.description = f"{e.__class__.__name__}: {current_request.url}." \
                                f" IP: {_remote_address()}. " + e.description
                skip_email = "sent a request that this server could not understand" in e.description
            elif isinstance(e, DatabaseError):
                e = BadRequest("Database error")
                skip_email = True
            if isinstance(e, HTTPException):
                message = e.description
            elif isinstance(e, KeyError):
                message = f"Missing key {e}"
            else:
                message = str(e)
            response = jsonify(message=message, error=True)
            response.status_code = 500
            if isinstance(e, NoResultFound):
                response.status_code = 404
            elif isinstance(e, HTTPException):
                response.status_code = e.code
            elif isinstance(e, (ValidationError, BadRequest, APIBadRequest, KeyError)):
                response.status_code = 400
            _add_custom_header(response)
            db.session.rollback()
            # We want to send emails if the exception is unexpected and validation errors should not happen server-side
            if isinstance(e, Conflict):
                ctx_logger("base").info(response)
            else:
                ctx_logger("base").exception(response)
            if not skip_email and (response.status_code == 500 or response.status_code == 400):
                send_error_mail(tb=traceback.format_exc())
            return response
        finally:
            db.session.close()

    return wrapper


@base_api.route("/health", strict_slashes=False)
@json_endpoint
def health():
    database_status = False
    try:
        User.query.first()
        database_status = True
    except OperationalError:
        db.session.rollback()
        pass

    redis_status = False
    try:
        redis_up = current_app.redis_client.set("status", "up")
        if redis_up:
            redis_status = True
    except ConnectionError:
        pass

    response_status = 200 if database_status and redis_status else 400
    return {"status": "UP" if response_status == 200 else "DOWN",
            "components": {
                "database": "UP" if database_status else "DOWN",
                "redis": "UP" if redis_status else "DOWN"
            }}, response_status


@base_api.route("/config", strict_slashes=False)
@json_endpoint
def config():
    cfg = current_app.app_config
    cfq = cfg.collaboration_suspension
    threshold_for_warning = cfq.collaboration_inactivity_days_threshold - cfq.inactivity_warning_mail_days_threshold
    return {"local": current_app.config["LOCAL"],
            "base_url": application_base_url(),
            "base_server_url": server_base_url(),
            "socket_url": cfg.socket_url,
            "api_keys_enabled": cfg.feature.api_keys_enabled,
            "feedback_enabled": cfg.feature.feedback_enabled,
            "seed_allowed": cfg.feature.seed_allowed,
            "organisation_categories": cfg.organisation_categories,
            "second_factor_authentication_required": cfg.oidc.second_factor_authentication_required,
            "impersonation_allowed": cfg.feature.impersonation_allowed,
            "ldap_url": cfg.ldap.url,
            "ldap_bind_account": cfg.ldap.bind_account,
            "continue_eduteams_redirect_uri": cfg.oidc.continue_eduteams_redirect_uri,
            "continue_eb_redirect_uri": cfg.oidc.continue_eb_redirect_uri,
            "introspect_endpoint": f"{cfg.base_server_url}/api/tokens/introspect",
            "past_dates_allowed": cfg.feature.past_dates_allowed,
            "mock_scim_enabled": cfg.feature.mock_scim_enabled,
            "threshold_for_collaboration_inactivity_warning": threshold_for_warning,
            "manage_enabled": cfg.manage.enabled,
            "manage_base_url": cfg.manage.base_url,
            "sram_service_entity_id": cfg.oidc.sram_service_entity_id.lower()
            }, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = Path(f"{os.path.dirname(os.path.realpath(__file__))}/git.info")
    if file.is_file():
        with open(str(file)) as f:
            return {"git": f.read()}, 200
    return {"git": "nope"}, 200
