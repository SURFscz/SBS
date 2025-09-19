import base64
import io
import random
import string
import uuid
from datetime import timedelta

import qrcode
from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, session, jsonify
from werkzeug.exceptions import NotFound, Forbidden, HTTPException

from server.api.base import json_endpoint
from server.auth.security import current_user_id
from server.auth.service_access import has_user_access_to_service
from server.auth.tokens import validate_service_token
from server.db.db import db
from server.db.defaults import PAM_WEB_LOGIN, SERVICE_TOKEN_PAM
from server.db.domain import User, PamSSOSession, Service, CollaborationMembership
from server.db.models import log_user_login, flatten
from server.logger.context_logger import ctx_logger
from server.tools import dt_now

pam_websso_api = Blueprint("pam_weblogin_api", __name__, url_prefix="/pam-weblogin")


def _get_pam_sso_session(session_id) -> PamSSOSession:
    pam_sso_session = PamSSOSession.query.filter(PamSSOSession.session_id == session_id).first()
    if not pam_sso_session:
        raise NotFound(f"No PamSSOSession with session_id {session_id} found")
    timeout = current_app.app_config.pam_web_sso.session_timeout_seconds
    seconds_ago = dt_now() - timedelta(hours=0, minutes=0, seconds=timeout)
    if pam_sso_session.created_at < seconds_ago:
        db.session.delete(pam_sso_session)
        raise NotFound(f"PamSSOSession with session_id {session_id} is expired")
    return pam_sso_session


def _validate_pam_sso_session(pam_sso_session: PamSSOSession, pin, validate_pin, validate_user):
    user: User = pam_sso_session.user
    service = pam_sso_session.service

    if validate_user and ("user" not in session or user.id != current_user_id()):
        return {"result": "FAIL", "info": f"User {user.uid} is not authenticated"}

    if validate_user and not has_user_access_to_service(service, user):
        return {"result": "FAIL", "info": f"User {user.uid} has no access to service {service.name}"}

    if validate_pin and pam_sso_session.pin != pin:
        return {"result": "FAIL", "info": "Incorrect pin"}

    def include_service(s: Service, m: CollaborationMembership):
        return s in m.collaboration.services

    collaborations = []
    groups = []

    for m in user.collaboration_memberships:
        if include_service(service, m):
            collaborations.append(
                {
                    "short_name": m.collaboration.short_name,
                    "name": m.collaboration.name,
                    "urn": m.collaboration.global_urn,
                    "id": m.collaboration.identifier
                }
            )

            for g in m.collaboration.groups:
                groups.append(
                    {
                        "short_name": g.short_name,
                        "name": g.name,
                        "urn": g.global_urn,
                        "id": g.identifier
                    }
                )

    sorted_collaborations = sorted(collaborations, key=lambda collaboration: collaboration["name"].lower())
    sorted_groups = sorted(groups, key=lambda group: group["name"].lower())
    return {"result": "SUCCESS",
            "username": user.username,
            "collaborations": sorted_collaborations,
            "groups": sorted_groups,
            "info": f"User {user.uid} has authenticated successfully"}


@pam_websso_api.route("/status/success/<session_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def success_by_session_id(session_id):
    pam_sso_session = PamSSOSession.query.filter(PamSSOSession.session_id == session_id).first()
    return False if pam_sso_session else True, 200


# This is the challenge URL
@pam_websso_api.route("/<service_shortname>/<session_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_pam_sso_session_by_id.yml")
@json_endpoint
def find_by_session_id(service_shortname, session_id):
    pam_sso_session = _get_pam_sso_session(session_id)
    if pam_sso_session.pin_shown:
        raise Forbidden("PIN already shown")
    if pam_sso_session.service.abbreviation.lower() != service_shortname.lower():
        raise Forbidden(f"Short name {service_shortname} is not correct")
    service_json = jsonify(pam_sso_session.service).json
    res = {"service": service_json}
    if "user" in session and not session["user"]["guest"]:
        if not pam_sso_session.user:
            pam_sso_session.user = db.session.get(User, current_user_id())
            db.session.add(pam_sso_session)
        res["validation"] = _validate_pam_sso_session(pam_sso_session, None, False, True)
        res["pin"] = pam_sso_session.pin
        # Ensure the link can't be used anymore, but we can't delete it as we need to verify the entered pin
        pam_sso_session.pin_shown = True
        db.session.merge(pam_sso_session)
    return res, 200


@pam_websso_api.route("/start", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/start_pam_sso_session.yml")
@json_endpoint
def start():
    service = validate_service_token("pam_web_sso_enabled", SERVICE_TOKEN_PAM)

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
        if not has_user_access_to_service(service, user):
            log_user_login(PAM_WEB_LOGIN, False, user, user.uid, service, service.entity_id,
                           status="No access to service")

            logger.debug(f"PamWebSSO access to service {service.name} denied (no CO access): {data}")
            raise NotFound(f"User {filters} access denied")

        # Now we can empty the session again, as we want to be stateless
        session.clear()
        session.modified = False

        pam_last_login_date = user.pam_last_login_date
        seconds_ago = dt_now() - timedelta(hours=0, minutes=0, seconds=cache_duration)
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

    qr = qrcode.QRCode(border=1)
    qr.add_data(url)

    # ASCII QRCode
    f = io.StringIO()
    qr.print_ascii(out=f, invert=True)
    f.seek(0)
    qr_code_ascii = f.read()

    # Base64 PNG QRCode
    png = io.BytesIO()
    qr.make_image().save(png, format="PNG")
    qr_code_png = base64.b64encode(png.getvalue()).decode()

    return {
        "result": "OK",
        "cached": False,
        "session_id": pam_sso_session.session_id,
        "challenge": f"{qr_code_ascii}\nGet a verification code via: {url}\n(or scan the QR code)",
        "url": f"{url}",
        "qr_code_ascii": f"{qr_code_ascii}",
        "qr_code_png": f"{qr_code_png}"
    }, 201


@pam_websso_api.route("/check-pin", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/check_pin_pam_sso_session.yml")
@json_endpoint
def check_pin():
    service = validate_service_token("pam_web_sso_enabled", SERVICE_TOKEN_PAM)

    logger = ctx_logger("pam_weblogin")
    try:
        data = current_request.get_json()
    except HTTPException:
        logger.error("BadRequest in /api.pam/check-pin", exc_info=1)
        return {"result": "FAIL", "info": "Invalid JSON"}, 201

    session_id = data.get("session_id", None)
    pin = data.get("pin", None)

    if not session_id or not pin:
        return {"result": "FAIL", "info": "Invalid request. Both session_id and pin are required"}, 201

    try:
        pam_sso_session = _get_pam_sso_session(session_id)
    except NotFound:
        return {"result": "TIMEOUT", "info": "Pam session not found or expired"}, 201

    user = pam_sso_session.user
    if not user:
        return {"result": "FAIL", "info": "No user is authenticated"}, 201

    validation = _validate_pam_sso_session(pam_sso_session, pin, True, False)
    success = validation["result"] == "SUCCESS"
    if success:
        db.session.delete(pam_sso_session)
        user.pam_last_login_date = dt_now()
        user.suspended = False
        db.session.merge(user)
        # We also update the activity date of linked collaboration
        collaborations = [cm.collaboration for cm in user.collaboration_memberships if
                          service in cm.collaboration.services]
        for collaboration in collaborations:
            collaboration.last_activity_date = dt_now()
            db.session.merge(collaboration)
        db.session.commit()

    log_user_login(PAM_WEB_LOGIN, success, user, user.uid, service, service.entity_id, status=validation["result"])

    logger.debug(f"PamWebSSO check-pin for service {service.name} for user {user.uid} with result {validation}")

    return validation, 201


@pam_websso_api.route("/ssh_keys", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_ssh_keys_pam_sso_service.yml")
@json_endpoint
def ssh_keys():
    service = validate_service_token("pam_web_sso_enabled", SERVICE_TOKEN_PAM)

    logger = ctx_logger("pam_weblogin")

    co_memberships = flatten([co.collaboration_memberships for co in service.collaborations])
    org_collaborations = flatten([org.collaborations for org in service.organisations])
    all_memberships = co_memberships + flatten([co.collaboration_memberships for co in org_collaborations])
    all_valid_memberships = [member for member in all_memberships if member.is_active()]
    all_ssh_keys = flatten([member.user.ssh_keys for member in all_valid_memberships])
    all_ssh_values = list(set([ssh_key.ssh_value for ssh_key in all_ssh_keys]))

    logger.debug(f"Returning {len(all_ssh_values)} ssh_keys to service {service.name}")

    return all_ssh_values, 200
