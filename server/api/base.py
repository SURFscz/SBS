import logging
import os
import time
from datetime import date
from functools import wraps

from flask import Blueprint, jsonify, current_app, request as current_request, session, g as request_context
from flask.json import JSONEncoder
from werkzeug.exceptions import HTTPException, Unauthorized

base_api = Blueprint("base_api", __name__, url_prefix="/")

white_listing = ["health", "info", "api/users/me", "api/collaboration/find_by_name"]


def auth_filter(config):
    url = current_request.base_url

    if "user" in session and not session["user"]["guest"]:
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
        request_context.api_user = get_user(config, auth)[0].name


def get_user(config, auth):
    return list(filter(lambda user: user.name == auth.username and user.password == auth.password, config.api_users))


def _add_custom_header(response):
    response.headers.set("x-session-alive", "true")
    response.headers["server"] = ""


class DynamicExtendedJSONEncoder(JSONEncoder):
    def default(self, o):
        if hasattr(o, "__json__"):
            return o.__json__()
        if isinstance(o, date):
            return time.mktime(o.timetuple())
        return super(DynamicExtendedJSONEncoder, self).default(o)


def json_endpoint(f):
    @wraps(f)
    def json(*args, **kwargs):
        try:
            auth_filter(current_app.app_config)
            body, status = f(*args, **kwargs)
            response = jsonify(body)
            _add_custom_header(response)
            return response, status
        except Exception as e:
            response = jsonify(message=e.description if isinstance(e, HTTPException) else str(e))
            logging.getLogger().exception(response)
            response.status_code = e.code if isinstance(e, HTTPException) else 500
            _add_custom_header(response)
            if response.status_code == 401:
                response.headers.set("WWW-Authenticate", "Basic realm=\"Please login\"")
            return response

    return json


@base_api.route("/health", strict_slashes=False)
@json_endpoint
def health():
    return {"status": "UP"}, 200


@base_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    file = f"{os.path.dirname(os.path.realpath(__file__))}/git.info"
    if os.path.isfile(file):
        with open(file) as f:
            return {"git": f.read()}, 200
    return {"git": "no.info"}, 200
