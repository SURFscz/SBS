# -*- coding: future_fstrings -*-
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, request as current_request, current_app
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.auth.tokens import validate_service_token
from server.db.db import db
from server.db.domain import User, PamSSOSession, Service

pam_websso_api = Blueprint("pam_websso_api", __name__, url_prefix="/pam-websso")


@pam_websso_api.route("/<session_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def find_by_session_id(session_id):
    pam_sso_session = PamSSOSession.query.filter(PamSSOSession.session_id == session_id).one()
    timeout = current_app.app_config.pam_web_sso.session_timeout_seconds
    seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=timeout)
    if pam_sso_session.created_at < seconds_ago:
        raise BadRequest("session has expired")
    service = Service.query.filter(Service.id == pam_sso_session.service_id).one()
    return {"pam_sso_session": pam_sso_session, "service": service}, 200


@pam_websso_api.route("/start", methods=["POST"], strict_slashes=False)
@json_endpoint
def introspect():
    service = validate_service_token("pam_web_sso_enabled")
    data = current_request.get_json()
    user_id = data["user_id"]
    attribute = data["attribute"]
    cache_duration = int(data.get("cache_duration", 60 * 10))
    filters = {attribute: user_id}
    user = User.query.filter_by(**filters).one()

    last_login_date = user.last_login_date
    seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=cache_duration)
    if last_login_date and last_login_date > seconds_ago:
        return {"result": "OK", "cached": True}, 200

    pam_sso_session = PamSSOSession(session_id=str(uuid.uuid4()), attribute=attribute, user_id=user.id,
                                    service_id=service.id)
    db.session.add(pam_sso_session)

    return {"result": "OK",
            "session_id": pam_sso_session.session_id,
            "challenge": f"{current_app.app_config.base_url}/pam-websso/login/{pam_sso_session.session_id}",
            "cached": False}, 201
