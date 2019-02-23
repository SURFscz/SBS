import json
import logging
import os
from functools import wraps

from flask import Blueprint, jsonify, current_app, request as current_request, session, g as request_context
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest

from server.db.db import db

base_api = Blueprint("base_api", __name__, url_prefix="/")

white_listing = ["health", "config", "info", "api/users/me", "api/collaborations/find_by_name"]


def auth_filter(config):
    url = current_request.base_url

    if "user" in session and "guest" in session["user"] and not session["user"]["guest"]:
        request_context.is_authorized_api_call = False
        return

    is_whitelisted_url = False
    for u in white_listing:
        if u in url:
            is_whitelisted_url = True

    auth = current_request.authorization
    is_authorized_api_call = bool(auth and len(get_user(config, auth)) > 0)

    if not (is_whitelisted_url or is_authorized_api_call):
        raise Unauthorized(description="Invalid username or password")

    request_context.is_authorized_api_call = is_authorized_api_call
    if is_authorized_api_call:
        request_context.api_user = get_user(config, auth)[0]


def query_param(key, required=True, default=None):
    value = current_request.args.get(key, default=default)
    if required and value is None:
        raise BadRequest(f"Query parameter {key} is required, but missing")
    return value


def get_user(config, auth):
    return list(filter(lambda user: user.name == auth.username and user.password == auth.password, config.api_users))


def _add_custom_header(response):
    response.headers.set("x-session-alive", "true")
    response.headers["server"] = ""


_audit_trail_methods = ["PUT", "POST", "DELETE"]


def _audit_trail():
    method = current_request.method
    if method in _audit_trail_methods:
        msg = json.dumps(current_request.json) if method != "DELETE" else ""
        user_name = session["user"]["uid"] if "user" in session else request_context.api_user.name
        logger = logging.getLogger("main")
        logger.info(f"Path {current_request.path} {method} called by {user_name} {msg}")


def _commit_database(status):
    if status == 500:
        db.session.rollback()
    else:
        db.session.commit()


def json_endpoint(f):
    @wraps(f)
    def json(*args, **kwargs):
        try:
            auth_filter(current_app.app_config)
            body, status = f(*args, **kwargs)
            response = jsonify(body)
            _audit_trail()
            _add_custom_header(response)
            _commit_database(status)
            return response, status
        except Exception as e:
            response = jsonify(message=e.description if isinstance(e, HTTPException) else str(e))
            logging.getLogger().exception(response)
            if isinstance(e, NoResultFound):
                response.status_code = 404
            elif isinstance(e, HTTPException):
                response.status_code = e.code
            else:
                response.status_code = 500
            _add_custom_header(response)
            if response.status_code == 401:
                response.headers.set("WWW-Authenticate", "Basic realm=\"Please login\"")
            _commit_database(response.status_code)
            return response

    return json


@base_api.route("/health", strict_slashes=False)
@json_endpoint
def health():
    return {"status": "UP"}, 200


@base_api.route("/config", strict_slashes=False)
@json_endpoint
def config():
    base_url = current_app.app_config.base_url
    base_url = base_url[:-1] if base_url.endswith("/") else base_url
    return {"local": current_app.config["LOCAL"],
            "base_url": base_url}, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = f"{os.path.dirname(os.path.realpath(__file__))}/git.info"
    with open(file) as f:
        return json.loads(f.read()), 200
