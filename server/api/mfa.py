import base64
import datetime
import re
from io import BytesIO
from typing import Optional

import pyotp
import qrcode
import urllib.parse
from flask import Blueprint, current_app, session, request as current_request
from werkzeug.exceptions import Forbidden, BadRequest

from server.api.base import query_param, json_endpoint
from server.auth.mfa import store_user_in_session, eligible_users_to_reset_token
from server.auth.rate_limit import clear_rate_limit, check_rate_limit
from server.auth.secrets import generate_token
from server.auth.security import current_user_id, is_admin_user, is_application_admin
from server.auth.ssid import redirect_to_surf_secure_id
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.defaults import uri_re
from server.db.domain import User
from server.logger.context_logger import ctx_logger
from server.mail import mail_reset_token

mfa_api = Blueprint("mfa_api", __name__, url_prefix="/api/mfa")


def _do_get2fa(schac_home_organisation, user_identifier):
    secret = pyotp.random_base32()
    session["second_factor_auth"] = secret
    name = current_app.app_config.oidc.totp_token_name
    secret_url = pyotp.totp.TOTP(secret).provisioning_uri(user_identifier, name)
    img = qrcode.make(secret_url)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    idp_name = idp_display_name(schac_home_organisation, "en", use_default=True)
    return {"qr_code_base64": img_str, "secret": secret, "idp_name": idp_name}, 200


def _totp_backdoor(user):
    enabled = is_admin_user(user) and current_app.app_config.feature.admin_platform_backdoor_totp
    if enabled:
        data = current_request.get_json()
        return data["totp"] == "000000"
    return False


def _do_verify_2fa(user: User, secret):
    data = current_request.get_json()
    totp_value = data["totp"]
    totp = pyotp.TOTP(secret)
    if totp.verify(totp_value, valid_window=1) or _totp_backdoor(user):
        if not user.second_factor_auth:
            user.second_factor_auth = secret
        user.last_login_date = datetime.datetime.now()
        user = db.session.merge(user)
        db.session.commit()
        store_user_in_session(user, True, user.has_agreed_with_aup())
        return True
    else:
        return False


@mfa_api.route("/token_reset_request", methods=["GET"], strict_slashes=False)
@json_endpoint
def token_reset_request():
    second_fa_uuid = query_param("second_fa_uuid", required=False)
    if second_fa_uuid:
        user = _get_user_by_second_fa_uuid(second_fa_uuid)
    else:
        user = User.query.filter(User.id == current_user_id()).one()
    return eligible_users_to_reset_token(user), 200


@mfa_api.route("/token_reset_request", methods=["POST"], strict_slashes=False)
@json_endpoint
def token_reset_request_post():
    data = current_request.get_json()
    email = data["email"]
    second_fa_uuid = data.get("second_fa_uuid", None)
    if second_fa_uuid:
        user = _get_user_by_second_fa_uuid(second_fa_uuid)
    else:
        user = User.query.filter(User.id == current_user_id()).one()
    admins = eligible_users_to_reset_token(user)
    if len(list(filter(lambda admin: admin["email"] == email, admins))) == 0:
        raise Forbidden()
    user.mfa_reset_token = generate_token()
    db.session.merge(user)
    db.session.commit()
    mail_reset_token(email, user, data["message"])
    return {}, 201


@mfa_api.route("/get2fa", methods=["GET"], strict_slashes=False)
@json_endpoint
def get2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    return _do_get2fa(user.schac_home_organisation, user.email)


@mfa_api.route("/get2fa_proxy_authz", methods=["GET"], strict_slashes=False)
@json_endpoint
def get2fa_proxy_authz():
    second_fa_uuid = query_param("second_fa_uuid")
    user = _get_user_by_second_fa_uuid(second_fa_uuid)
    if user.second_factor_auth:
        return {}, 200
    return _do_get2fa(user.schac_home_organisation, user.email)


def _get_user_by_second_fa_uuid(second_fa_uuid):
    if not second_fa_uuid:
        raise BadRequest("second_fa_uuid is empty")
    return User.query.filter(User.second_fa_uuid == second_fa_uuid).one()


@mfa_api.route("/verify2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def verify2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    check_rate_limit(user)

    secret = user.second_factor_auth if user.second_factor_auth else session["second_factor_auth"]
    valid_totp = _do_verify_2fa(user, secret)

    if valid_totp:
        location = session.get("original_destination", current_app.app_config.base_url)
        clear_rate_limit(user)
        return {"location": location}, 201
    else:
        return {"new_totp": False}, 400


# verify continue url and compare it to the configured allowed continue url
def _construct_continue_url(base_url: str, to_check: str) -> Optional[str]:
    if not bool(uri_re.match(to_check)) or not bool(uri_re.match(base_url)):
        return None

    base = urllib.parse.urlparse(base_url)
    url = urllib.parse.urlparse(to_check)

    if base.scheme != url.scheme or base.netloc != url.netloc:
        return None

    # check if there are any other chars than A-Za-z0-9=_- in url.path
    if re.match(r"[^a-zA-Z0-9_=/-]", url.path):
        return None

    base_path = base.path.split('/') if base.path else []
    url_path = url.path.split('/') if url.path else []

    if len(url_path) != len(base_path) + 1:
        return None
    for a, b in zip(base_path, url_path):
        if a != b:
            return None

    return urllib.parse.urlunparse([base.scheme, base.netloc, url.path, url.query, "", ""])


@mfa_api.route("/verify2fa_proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def verify2fa_proxy_authz():
    data = current_request.get_json()
    second_fa_uuid = data["second_fa_uuid"]
    user = _get_user_by_second_fa_uuid(second_fa_uuid)
    check_rate_limit(user)

    secret = user.second_factor_auth if user.second_factor_auth else session["second_factor_auth"]
    valid_totp = _do_verify_2fa(user, secret)
    if valid_totp:
        clear_rate_limit(user)
        base_uri = current_app.app_config.oidc.continue_eduteams_redirect_uri
        continue_url = _construct_continue_url(base_uri, data["continue_url"])
        if not continue_url:
            raise Forbidden("Invalid continue_url")

        return {"location": continue_url}, 201
    else:
        return {"new_totp": False}, 400


@mfa_api.route("/pre-update2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def pre_update2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    current_secret = user.second_factor_auth
    data = current_request.get_json()
    current_totp_value = data["totp_value"]
    verified_current = pyotp.TOTP(current_secret).verify(current_totp_value)
    if not verified_current:
        return {"current_totp": False}, 400
    session["validated_current_totp"] = True
    return {}, 201


@mfa_api.route("/update2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def update2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    validated_current_totp = session.get("validated_current_totp")
    if not validated_current_totp:
        return {"current_totp": False}, 400
    new_secret = session["second_factor_auth"]
    data = current_request.get_json()
    new_totp_value = data["new_totp_value"]
    verified_new = pyotp.TOTP(new_secret).verify(new_totp_value)
    if not verified_new:
        return {"new_totp": False}, 400

    user.second_factor_auth = new_secret
    db.session.merge(user)
    db.session.commit()
    session.pop("validated_current_totp")
    return {}, 201


@mfa_api.route("/reset2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def reset2fa():
    data = current_request.get_json()
    second_fa_uuid = data.get("second_fa_uuid", None)
    if second_fa_uuid:
        user = _get_user_by_second_fa_uuid(second_fa_uuid)
    else:
        user = User.query.filter(User.id == current_user_id()).one()
    token = data["token"]
    if not token or token != user.mfa_reset_token:
        raise Forbidden()
    user.second_factor_auth = None
    user.mfa_reset_token = None
    db.session.merge(user)
    db.session.commit()
    return {}, 201


@mfa_api.route("/reset2fa_other", methods=["PUT"], strict_slashes=False)
@json_endpoint
def reset2fa_other():
    data = current_request.get_json()
    user_id = data.get("user_id", None)

    user = User.query.filter(User.id == user_id).one()

    if not is_application_admin():
        curr_user = db.session.get(User, current_user_id())
        curr_user_orgs = [om.organisation_id for om in curr_user.organisation_memberships if om.role == "admin"]
        user_orgs = [cm.collaboration.organisation_id for cm in user.collaboration_memberships]
        if not any([i in curr_user_orgs for i in user_orgs]):
            raise Forbidden()

    user.second_factor_auth = None
    user.mfa_reset_token = None
    db.session.merge(user)
    db.session.commit()
    return {}, 201


@mfa_api.route("/ssid_start/<second_fa_uuid>", strict_slashes=False)
def do_ssid_redirect(second_fa_uuid):
    logger = ctx_logger("2fa")

    continue_url = query_param("continue_url", required=True)
    session["ssid_original_destination"] = continue_url
    user = _get_user_by_second_fa_uuid(second_fa_uuid)

    if user.home_organisation_uid and user.schac_home_organisation:
        logger.debug(f"do_ssid_redirect: continue_url={continue_url}, user={user}")
        user = db.session.merge(user)
        db.session.commit()
        return redirect_to_surf_secure_id(user)

    logger.warning(f"user {user.id} marked as ssid_required has no home_organisation_uid {user.home_organisation_uid}"
                   f" or no schac_home_organisation {user.schac_home_organisation}")

    from server.api.user import redirect_to_client

    return redirect_to_client(current_app.app_config, False, user)
