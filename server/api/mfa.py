# -*- coding: future_fstrings -*-
import base64
import json
from io import BytesIO
from time import time
from urllib.parse import quote
from uuid import uuid4

import jwt
import pyotp
import qrcode
from flask import Blueprint, current_app, redirect, session, request as current_request

from server.api.base import query_param, json_endpoint
from server.auth.mfa import ACR_VALUES, decode_jwt_token, store_user_in_session
from server.auth.security import current_user_id
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.domain import User
from server.logger.context_logger import ctx_logger
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
        public_key_json = read_file(current_app.app_config.oidc.public_rsa_signing_key_path)
    return json.loads(public_key_json)


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


@mfa_api.route("/get2fa", methods=["GET"], strict_slashes=False)
@json_endpoint
def get2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    secret = pyotp.random_base32()
    session["second_factor_auth"] = secret
    name = "LOCAL" if current_app.app_config.profile == "local" else "SRAM"
    secret_url = pyotp.totp.TOTP(secret).provisioning_uri(user.email, name)
    img = qrcode.make(secret_url)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    idp_name = idp_display_name(user.schac_home_organisation, "en")
    return {"qr_code_base64": img_str, "secret": secret, "idp_name": idp_name}, 200


@mfa_api.route("/verify2fa", methods=["POST"], strict_slashes=False)
@json_endpoint
def verify2fa():
    user = User.query.filter(User.id == current_user_id()).one()
    secret = user.second_factor_auth if user.second_factor_auth else session["second_factor_auth"]
    data = current_request.get_json()
    totp_value = data["totp"]
    totp = pyotp.TOTP(secret)
    if totp.verify(totp_value):
        if not user.second_factor_auth:
            user.second_factor_auth = secret
            user = db.session.merge(user)
            db.session.commit()
        store_user_in_session(user, True)
        location = session.get("original_destination", current_app.app_config.base_url)
        in_proxy_flow = session.get("in_proxy_flow", False)
        if in_proxy_flow:
            oidc_config = current_app.app_config.oidc
            id_token = _construct_jwt(user, str(uuid4()), oidc_config)
            location = f"{oidc_config.sfo_eduteams_redirect_uri}?id_token={id_token}"
        return {"location": location, "in_proxy_flow": in_proxy_flow}, 201
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

    store_user_in_session(user, False)

    return redirect(f"{current_app.app_config.base_url}/2fa")


@mfa_api.route("/jwks", strict_slashes=False)
@json_endpoint
def jwks():
    return _get_public_key(), 200
