# -*- coding: future_fstrings -*-
import json
from time import time
from urllib.parse import quote
from uuid import uuid4

import jwt
from flask import Blueprint, current_app, redirect

from server.api.base import query_param
from server.auth.oidc import ACR_VALUES, decode_jwt_token, store_user_in_session
from server.db.domain import User
from server.logger.context_logger import ctx_logger
from server.tools import read_file

oidc_api = Blueprint("oidc_api", __name__, url_prefix="/api/oidc")
# TODO make  lazy and use config
private_key = read_file("test/data/jwt-private-key")
public_key_json = json.loads(read_file("test/data/jwt-public-key.json"))


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
    public_key = public_key_json["keys"][0]
    return jwt.encode(payload, private_key, algorithm=public_key["kid"], headers={"kid": public_key["kid"]})


@oidc_api.route("/sfo", strict_slashes=False)
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

    store_user_in_session(user, False)

    return redirect(f"{current_app.app_config.base_url}/2fa")
