# -*- coding: future_fstrings -*-
import random
import string
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, request as current_request, current_app, session
from werkzeug.exceptions import NotFound

from server.api.base import json_endpoint
from server.api.service import user_service
from server.auth.security import current_user_id
from server.auth.tokens import validate_service_token
from server.db.db import db
from server.db.domain import User, PamSSOSession
from server.logger.context_logger import ctx_logger

pam_websso_api = Blueprint("pam_websso_api", __name__, url_prefix="/pam-websso")


def _get_pam_sso_session(session_id):
    pam_sso_session = PamSSOSession.query.filter(PamSSOSession.session_id == session_id).first()
    if not pam_sso_session:
        raise NotFound(f"No PamSSOSession with session_id {session_id} found")
    timeout = current_app.app_config.pam_web_sso.session_timeout_seconds
    seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=timeout)
    if pam_sso_session.created_at < seconds_ago:
        db.session.delete(pam_sso_session)
        raise NotFound(f"PamSSOSession with session_id {session_id} is expired")
    return pam_sso_session


def _validate_pam_sso_session(pam_sso_session: PamSSOSession, pin, validate_pin, validate_user):
    user = pam_sso_session.user
    service = pam_sso_session.service

    if validate_user and ("user" not in session or user.id != current_user_id()):
        return {"result": "FAIL", "debug_msg": f"User {user.uid} is not authenticated"}

    if validate_user and not user_service(service.id, False):
        return {"result": "FAIL", "debug_msg": f"User {user.uid} has no access to service {service.name}"}

    if validate_pin and pam_sso_session.pin != pin:
        return {"result": "FAIL", "debug_msg": f"User {user.uid} has entered a pin ({pin}) "
                                               f"different to the pin generated ({pam_sso_session.pin})"}

    return {"result": "SUCCESS", "debug_msg": f"User {user.uid} has authenticated successfully"}


@pam_websso_api.route("/<session_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def find_by_session_id(session_id):
    pam_sso_session = _get_pam_sso_session(session_id)
    res = {"service": pam_sso_session.service}
    if "user" in session and not session["user"]["guest"]:
        res["validation"] = _validate_pam_sso_session(pam_sso_session, None, False, True)
        res["pin"] = pam_sso_session.pin
    return res, 200


@pam_websso_api.route("/start", methods=["POST"], strict_slashes=False)
@json_endpoint
def start():
    logger = ctx_logger("pam_websso")

    service = validate_service_token("pam_web_sso_enabled")
    data = current_request.get_json()
    user_id = data["user_id"]
    attribute = data["attribute"]
    cache_duration = int(data.get("cache_duration", 60 * 10))
    filters = {attribute: user_id}

    logger.debug(f"Start PamWebSSO for service {service.name} with data {str(data)}")

    user = User.query.filter_by(**filters).first()
    if not user:
        raise NotFound(f"User {filters} not found")

    last_login_date = user.last_login_date
    seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=cache_duration)
    if last_login_date and last_login_date > seconds_ago:
        session["user"] = {"id": user.id, "admin": False}
        if user_service(service.id, False):
            logger.debug(f"PamWebSSO user {user.uid} SSO results")

            session.clear()
            session.modified = False
            return {"result": "OK", "cached": True}, 201

    pam_sso_session = PamSSOSession(session_id=str(uuid.uuid4()), attribute=attribute, user_id=user.id,
                                    service_id=service.id, pin="".join(random.sample(string.digits, k=4)))
    db.session.add(pam_sso_session)

    logger.debug(f"PamWebSSO user {user.uid} new session")

    return {"result": "OK",
            "session_id": pam_sso_session.session_id,
            "challenge": f"{current_app.app_config.base_url}/gui-pam-websso/login/{pam_sso_session.session_id}",
            "cached": False}, 201


@pam_websso_api.route("/check-pin", methods=["POST"], strict_slashes=False)
@json_endpoint
def check_pin():
    logger = ctx_logger("pam_websso")
    service = validate_service_token("pam_web_sso_enabled")
    data = current_request.get_json()
    session_id = data["session_id"]
    pin = data["pin"]
    try:
        pam_sso_session = _get_pam_sso_session(session_id)
    except NotFound:
        return {"result": "TIMEOUT", "debug_msg": f"Pam session {session_id} has expired"}, 201

    user = pam_sso_session.user
    validation = _validate_pam_sso_session(pam_sso_session, pin, True, False)
    if validation["result"] == "SUCCESS":
        db.session.delete(pam_sso_session)

    logger.debug(f"PamWebSSO check-pin for service {service.name} for user {user.uid} with result {str(validation)}")

    return validation, 201
