import json

import jwt
import requests
from flask import current_app
from jwt import algorithms

ACR_VALUES = "https://refeds.org/profile/mfa"

public_keys = {}


def _get_algorithm(jwk):
    kty = jwk.get("kty", "RSA").upper()
    if kty == "RSA":
        return algorithms.RSAAlgorithm
    elif kty == "EC":
        return algorithms.ECAlgorithm
    elif kty == "HMAC":
        return algorithms.HMACAlgorithm
    else:
        raise ValueError(f"Unsupported algorithm {kty}")


def _refresh_public_keys():
    jwks_endpoint = current_app.app_config.oidc.jwks_endpoint
    jwks = requests.get(jwks_endpoint).json()

    global public_keys
    public_keys = {jwk["kid"]: _get_algorithm(jwk).from_jwk(json.dumps(jwk)) for jwk in jwks["keys"]}


def decode_jwt_token(token):
    kid = jwt.get_unverified_header(token)["kid"]
    if kid not in public_keys:
        _refresh_public_keys()
    key = public_keys[kid]
    return jwt.decode(token, key=key, algorithms=["RS256"], audience=current_app.app_config.oidc.client_id)
