# -*- coding: future_fstrings -*-
import base64
import datetime
from io import BytesIO
from time import time
from urllib.parse import quote
from uuid import uuid4

import jwt
import pyotp
import qrcode
from authlib.jose import jwk
from flask import Blueprint, current_app, redirect, session, request as current_request
from werkzeug.exceptions import Forbidden, TooManyRequests

from server.api.base import query_param, json_endpoint
from server.auth.mfa import ACR_VALUES, decode_jwt_token, store_user_in_session, eligible_users_to_reset_token
from server.auth.rate_limit import rate_limit_reached, clear_rate_limit
from server.auth.security import current_user_id, generate_token, is_admin_user
from server.auth.ssid import redirect_to_surf_secure_id
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.domain import User
from server.logger.context_logger import ctx_logger
from server.mail import mail_reset_token
from server.tools import read_file

mfa_api = Blueprint("mfa_api", __name__, url_prefix="/api/mfa")

private_key = None
public_key_json = None


def _get_private_key():
    global private_key
    if private_key is None:
        private_key = read_file(current_app.app_config.oidc.private_rsa_signing_key_path)
    return private_key


def _get_public_key():
    global public_key_json
    if public_key_json is None:
        public_key = read_file(current_app.app_config.oidc.public_rsa_signing_key_path)
        jwks = jwk.dumps(public_key, kty='RSA')
        jwks["alg"] = "RS256"
        jwks["kid"] = "sbs"
        jwks["use"] = "sig"
        public_key_json = {"keys": [jwks]}
    return public_key_json


def _construct_jwt(user, nonce, oidc_config):
    now = int(time())
    payload = {
        "sub": user.uid,
        "auth_time": now,
        "acr": [ACR_VALUES],
        "nonce": nonce,
        "aud": [oidc_config.audience],
        "exp": now + (60 * 10),
        "iat": now,
        "iss": oidc_config.client_id,
        "jti": str(uuid4())
    }
    public_signing_key = _get_public_key()["keys"][0]
    return jwt.encode(payload, _get_private_key(),
                      algorithm=public_signing_key["alg"],
                      headers={"kid": public_signing_key["kid"]})


def _do_get2fa(schac_home_organisation, user_identifier):
    secret = pyotp.random_base32()
    session["second_factor_auth"] = secret
    name = current_app.app_config.oidc.totp_token_name
    secret_url = pyotp.totp.TOTP(secret).provisioning_uri(user_identifier, name)
    img = qrcode.make(secret_url)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    idp_name = idp_display_name(schac_home_organisation, "en")
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
    user = User.query.filter(User.id == current_user_id()).one()
    return eligible_users_to_reset_token(user), 200


@mfa_api.route("/token_reset_request", methods=["POST"], strict_slashes=False)
@json_endpoint
def token_reset_request_post():
    data = current_request.get_json()
    email = data["email"]
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
    user = User.query.filter(User.second_fa_uuid == second_fa_uuid).one()
    if user.second_factor_auth:
        return {}, 200
    return _do_get2fa(user.schac_home_organisation, user.uid)


@mfa_api.route("/verify2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def verify2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    if rate_limit_reached(user):
        user.suspended = True
        db.session.merge(user)
        db.session.commit()
        session.clear()

        raise TooManyRequests(f"Suspended user {user.name} for rate limiting TOTP")

    secret = user.second_factor_auth if user.second_factor_auth else session["second_factor_auth"]
    valid_totp = _do_verify_2fa(user, secret)

    if valid_totp:
        location = session.get("original_destination", current_app.app_config.base_url)
        in_proxy_flow = session.get("in_proxy_flow", False)
        clear_rate_limit(user)
        if in_proxy_flow:
            oidc_config = current_app.app_config.oidc
            id_token = _construct_jwt(user, str(uuid4()), oidc_config)
            location = f"{oidc_config.sfo_eduteams_redirect_uri}?id_token={id_token}"
        return {"location": location, "in_proxy_flow": in_proxy_flow}, 201
    else:
        return {"new_totp": False}, 400


@mfa_api.route("/verify2fa_proxy_authz", methods=["POST"], strict_slashes=False)
@json_endpoint
def verify2fa_proxy_authz():
    data = current_request.get_json()
    second_fa_uuid = data["second_fa_uuid"]
    user = User.query.filter(User.second_fa_uuid == second_fa_uuid).one()
    secret = user.second_factor_auth if user.second_factor_auth else session["second_factor_auth"]
    valid_totp = _do_verify_2fa(user, secret)
    if valid_totp:
        continue_url = data["continue_url"]
        if not continue_url.lower().startswith(current_app.app_config.oidc.continue_eduteams_redirect_uri):
            raise Forbidden(f"Invalid continue_url: {continue_url}")
        return {"location": continue_url}, 201
    else:
        return {"new_totp": False}, 400


@mfa_api.route("/update2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def update2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    current_secret = user.second_factor_auth
    new_secret = session["second_factor_auth"]
    data = current_request.get_json()
    current_totp_value = data["current_totp"]
    new_totp_value = data["new_totp_value"]
    verified_current = pyotp.TOTP(current_secret).verify(current_totp_value)
    verified_new = pyotp.TOTP(new_secret).verify(new_totp_value)
    if not verified_current or not verified_new:
        return {"current_totp": not verified_current, "new_totp": not verified_new}, 400

    user.second_factor_auth = new_secret
    db.session.merge(user)
    db.session.commit()
    return {}, 201


@mfa_api.route("/reset2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def reset2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    data = current_request.get_json()
    token = data["token"]
    if not token or token != user.mfa_reset_token:
        raise Forbidden()
    user.second_factor_auth = None
    user.mfa_reset_token = None
    db.session.merge(user)
    db.session.commit()
    return {}, 201


@mfa_api.route("/sfo", strict_slashes=False)
def sfo():
    logger = ctx_logger("oidc")

    oidc_config = current_app.app_config.oidc
    encoded_access_token = query_param("access_token")

    access_token = decode_jwt_token(encoded_access_token)

    logger.debug(f"MFA endpoint with access_token {access_token}")

    uid = access_token["sub"]
    user = User.query.filter(User.uid == uid).first()
    if not user:
        error_msg = f"Unknown user with sub {uid}"
        logger.error(error_msg)
        return redirect(f"{oidc_config.sfo_eduteams_redirect_uri}?error={quote(error_msg)}")

    if not oidc_config.second_factor_authentication_required:
        id_token = _construct_jwt(user, access_token.get("nonce", str(uuid4())), oidc_config)
        return redirect(f"{oidc_config.sfo_eduteams_redirect_uri}?id_token={id_token}")
    # need to remember this if the user response comes back
    session["in_proxy_flow"] = True

    store_user_in_session(user, False, user.has_agreed_with_aup())

    return redirect(f"{current_app.app_config.base_url}/2fa")


@mfa_api.route("/jwks", strict_slashes=False)
@json_endpoint
def jwks():
    return _get_public_key(), 200


@mfa_api.route("/ssid_start/<second_fa_uuid>", strict_slashes=False)
def do_ssid_redirect(second_fa_uuid):
    logger = ctx_logger("2fa")

    continue_url = query_param("continue_url", required=True)
    session["ssid_original_destination"] = continue_url
    user = User.query.filter(User.second_fa_uuid == second_fa_uuid).one()

    logger.debug(f"do_ssid_redirect: continu={continue_url}, user={user}")

    return redirect_to_surf_secure_id(user)
