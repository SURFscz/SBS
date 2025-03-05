import base64
from io import BytesIO

import pyotp
import qrcode
from flask import Blueprint, current_app, session, request as current_request
from werkzeug.exceptions import Forbidden, Unauthorized

from server.api.base import json_endpoint
from server.auth.mfa import store_user_in_session, eligible_users_to_reset_token
from server.auth.rate_limit import clear_rate_limit, check_rate_limit
from server.auth.secrets import generate_token
from server.auth.security import current_user_id, is_admin_user, is_application_admin
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.domain import User
from server.mail import mail_reset_token

MAGIC_SUPER_TOTP = "000000"

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


def _totp_backdoor(user, totp_value=None):
    enabled = is_admin_user(user) and current_app.app_config.feature.admin_platform_backdoor_totp
    if enabled:
        data = current_request.get_json()
        return data.get("totp") == MAGIC_SUPER_TOTP or totp_value == MAGIC_SUPER_TOTP
    return False


def _do_verify_2fa(user: User, secret):
    data = current_request.get_json()
    totp_value = data["totp"]
    totp = pyotp.TOTP(secret)
    if totp.verify(totp_value, valid_window=1) or _totp_backdoor(user):
        if not user.second_factor_auth:
            user.second_factor_auth = secret
        user.successful_login()
        user = db.session.merge(user)
        db.session.commit()
        store_user_in_session(user, True, user.has_agreed_with_aup())
        return True
    else:
        return False


@mfa_api.route("/token_reset_request", methods=["GET"], strict_slashes=False)
@json_endpoint
def token_reset_request():
    user = User.query.filter(User.id == current_user_id()).first()
    if not user:
        raise Unauthorized("Invalid user")
    return eligible_users_to_reset_token(user), 200


@mfa_api.route("/token_reset_request", methods=["POST"], strict_slashes=False)
@json_endpoint
def token_reset_request_post():
    data = current_request.get_json()
    user = User.query.filter(User.id == current_user_id()).first()
    if not user:
        raise Unauthorized("Invalid user")
    # Prevent mail spamming
    check_rate_limit(user)

    admins = eligible_users_to_reset_token(user)
    email = data["email"]
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


@mfa_api.route("/pre-update2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def pre_update2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    current_secret = user.second_factor_auth
    data = current_request.get_json()
    current_totp_value = data["totp_value"]
    verified_current = pyotp.TOTP(current_secret).verify(current_totp_value) or _totp_backdoor(user, current_totp_value)
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
    verified_new = pyotp.TOTP(new_secret).verify(new_totp_value) or _totp_backdoor(user, new_totp_value)
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
    user = User.query.filter(User.id == current_user_id()).first()
    token = data.get("token")
    if not user or not token or token.strip() != user.mfa_reset_token:
        raise Unauthorized()
    user.second_factor_auth = None
    user.mfa_reset_token = None
    user.rate_limited = False
    db.session.merge(user)
    db.session.commit()

    clear_rate_limit(user)
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
    user.rate_limited = False
    db.session.merge(user)
    db.session.commit()
    return {}, 201
