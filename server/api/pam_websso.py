import io
import random
import string
import uuid
from datetime import datetime, timedelta

import qrcode
from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, session
from werkzeug.exceptions import NotFound, Forbidden, BadRequest

from server.api.base import json_endpoint
from server.api.service import user_service
from server.auth.security import current_user_id
from server.auth.tokens import validate_service_token
from server.db.db import db
from server.db.defaults import PAM_WEB_LOGIN
from server.db.domain import User, PamSSOSession
from server.db.models import log_user_login, flatten
from server.logger.context_logger import ctx_logger

pam_websso_api = Blueprint("pam_weblogin_api", __name__, url_prefix="/pam-weblogin")


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
        return {"result": "FAIL", "info": f"User {user.uid} is not authenticated"}

    if validate_user and not user_service(service.id, False):
        return {"result": "FAIL", "info": f"User {user.uid} has no access to service {service.name}"}

    if validate_pin and pam_sso_session.pin != pin:
        return {"result": "FAIL", "info": "Incorrect pin"}

    return {"result": "SUCCESS", "username": user.username, "info": f"User {user.uid} has authenticated successfully"}


# This is the challenge URL
@pam_websso_api.route("/<service_shortname>/<session_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_pam_sso_session_by_id.yml")
@json_endpoint
def find_by_session_id(service_shortname, session_id):
    pam_sso_session = _get_pam_sso_session(session_id)

    if pam_sso_session.service.abbreviation.lower() != service_shortname.lower():
        raise Forbidden(f"Short name {service_shortname} is not correct")

    res = {"service": pam_sso_session.service}
    if "user" in session and not session["user"]["guest"]:
        if not pam_sso_session.user:
            pam_sso_session.user = User.query.get(current_user_id())
            db.session.add(pam_sso_session)
        res["validation"] = _validate_pam_sso_session(pam_sso_session, None, False, True)
        res["pin"] = pam_sso_session.pin
    return res, 200


@pam_websso_api.route("/start", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/start_pam_sso_session.yml")
@json_endpoint
def start():
    service = validate_service_token("pam_web_sso_enabled")

    logger = ctx_logger("pam_weblogin")

    data = current_request.get_json()
    user_id = data.get("user_id")
    attribute = data.get("attribute")
    cache_duration = int(data.get("cache_duration", 60 * 10))
    filters = {attribute: user_id}

    logger.debug(f"Start PamWebSSO for service {service.name} with data {data}")
    user = None
    if user_id and attribute:
        user = User.query.filter_by(**filters).first()
        if not user:
            log_user_login(PAM_WEB_LOGIN, False, None, user_id, service, service.entity_id, status="User not found")

            logger.debug(f"PamWebSSO access to service {service.name} denied (user not found): {data}")
            raise NotFound(f"User {filters} not found")

        # The user validations expect a logged in user
        session["user"] = {"id": user.id, "admin": False}
        if not user_service(service.id, False):
            log_user_login(PAM_WEB_LOGIN, False, user, user.uid, service, service.entity_id,
                           status="No access to service")

            logger.debug(f"PamWebSSO access to service {service.name} denied (no CO access): {data}")
            raise NotFound(f"User {filters} access denied")

        # Now we can empty the session again, as we want to be stateless
        session.clear()
        session.modified = False

        pam_last_login_date = user.pam_last_login_date
        seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=cache_duration)
        if pam_last_login_date and pam_last_login_date > seconds_ago:
            log_user_login(PAM_WEB_LOGIN, True, user, user.uid, service, service.entity_id, status="Cached login")

            logger.debug(f"PamWebSSO user {user.uid} SSO results")
            return {"result": "OK", "cached": True, "username": user.username,
                    "info": f"User {user.uid} login was cached"}, 201

    pam_sso_session = PamSSOSession(session_id=str(uuid.uuid4()), attribute=attribute,
                                    user_id=user.id if user else None, service_id=service.id,
                                    pin="".join(random.sample(string.digits, k=4)))
    db.session.add(pam_sso_session)

    logger.debug(f"PamWebSSO user {user.uid if user else None} new session")
    url = f"{current_app.app_config.base_url}/weblogin/{service.abbreviation}/{pam_sso_session.session_id}"

    qr = qrcode.QRCode()
    qr.add_data(url)

    f = io.StringIO()
    qr.print_ascii(out=f, invert=True)
    f.seek(0)

    qr_code = f.read()

    return {"result": "OK",
            "session_id": pam_sso_session.session_id,
            "challenge": f"Please sign in to: {url}\n{qr_code}",
            "cached": False}, 201


@pam_websso_api.route("/check-pin", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/check_pin_pam_sso_session.yml")
@json_endpoint
def check_pin():
    service = validate_service_token("pam_web_sso_enabled")

    logger = ctx_logger("pam_weblogin")
    try:
        data = current_request.get_json()
    except BadRequest:
        logger.error("BadRequest in /api.pam/check-pin", exc_info=1)
        return {"result": "FAIL", "info": "Invalid JSON"}, 201

    session_id = data["session_id"]
    pin = data["pin"]
    try:
        pam_sso_session = _get_pam_sso_session(session_id)
    except NotFound:
        return {"result": "TIMEOUT", "info": "Pam session not found or expired"}, 201

    user = pam_sso_session.user
    validation = _validate_pam_sso_session(pam_sso_session, pin, True, False)
    success = validation["result"] == "SUCCESS"
    if success:
        db.session.delete(pam_sso_session)
        user.pam_last_login_date = datetime.now()
        db.session.merge(user)
        # We also update the activity date of linked collaboration
        collaborations = [cm.collaboration for cm in user.collaboration_memberships if
                          service in cm.collaboration.services]
        for collaboration in collaborations:
            collaboration.last_activity_date = datetime.now()
            db.session.merge(collaboration)
        db.session.commit()

    log_user_login(PAM_WEB_LOGIN, success, user, user.uid, service, service.entity_id, status=validation["result"])

    logger.debug(f"PamWebSSO check-pin for service {service.name} for user {user.uid} with result {validation}")
    return validation, 201


@pam_websso_api.route("/ssh_keys", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_ssh_keys_pam_sso_service.yml")
@json_endpoint
def ssh_keys():
    service = validate_service_token("pam_web_sso_enabled")

    logger = ctx_logger("pam_weblogin")

    co_memberships = flatten([co.collaboration_memberships for co in service.collaborations])
    org_collaborations = flatten([org.collaborations for org in service.organisations])
    all_memberships = co_memberships + flatten([co.collaboration_memberships for co in org_collaborations])
    all_valid_memberships = [member for member in all_memberships if member.is_active()]
    all_ssh_keys = flatten([member.user.ssh_keys for member in all_valid_memberships])
    all_ssh_values = list(set([ssh_key.ssh_value for ssh_key in all_ssh_keys]))

    logger.debug(f"Returning {len(all_ssh_values)} ssh_keys to service {service.name}")

    return all_ssh_values, 200
