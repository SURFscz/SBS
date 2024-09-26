import json
from datetime import timedelta

import jwt
import requests
from flask import current_app, session
from jwt import algorithms

from server.auth.secrets import generate_token
from server.auth.security import is_admin_user, CSRF_TOKEN
from server.db.db import db
from server.db.domain import Organisation, SchacHomeOrganisation, User
from server.logger.context_logger import ctx_logger
from server.tools import dt_now

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


def store_user_in_session(user, second_factor_confirmed, user_accepted_aup):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    res = {"admin": is_admin_user(user), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "second_factor_confirmed": second_factor_confirmed,
        "user_accepted_aup": user_accepted_aup,
        "name": user.name,
        "email": user.email,
        "rate_limited": user.rate_limited
    }
    session["user"] = {**session_data, **res}
    if CSRF_TOKEN not in session:
        session[CSRF_TOKEN] = generate_token()


def decode_jwt_token(token):
    kid = jwt.get_unverified_header(token)["kid"]
    if kid not in public_keys:
        _refresh_public_keys()
    key = public_keys[kid]
    return jwt.decode(token, key=key, algorithms=["RS256", "ES256"], audience=current_app.app_config.oidc.client_id)


def eligible_users_to_reset_token(user):
    user_information = []
    for org_membership in user.organisation_memberships:
        for membership in org_membership.organisation.organisation_memberships:
            if membership.role == "admin" and membership.user != user:
                user_information.append({"user": membership.user, "unit": membership.organisation.name})
    if not user_information:
        for coll_membership in user.collaboration_memberships:
            for membership in coll_membership.collaboration.collaboration_memberships:
                if membership.role == "admin" and membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.collaboration.name})
    if not user_information:
        for membership in user.collaboration_memberships:
            for mb in membership.collaboration.organisation.organisation_memberships:
                if mb.user != user:
                    user_information.append({"user": mb.user, "unit": mb.organisation.name})

    if not user_information and user.schac_home_organisation:
        organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
        if organisations:
            org = db.session.get(Organisation, organisations[0].id)
            for membership in org.organisation_memberships:
                if membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.organisation.name})

    user_info = [{"name": u["user"].name, "email": u["user"].email, "unit": u["unit"]} for u in user_information]
    if not user_info:
        # Empty strings will be translated client side
        user_info.append({"name": "", "email": current_app.app_config.mail.info_email, "unit": ""})

    return user_info


def has_valid_mfa(user):
    last_login_date = user.last_login_date
    login_sso_cutoff = timedelta(hours=0, minutes=int(current_app.app_config.mfa_sso_time_in_minutes))
    valid_mfa_sso = last_login_date and dt_now() - user.last_login_date < login_sso_cutoff

    logger = ctx_logger("user_api")
    logger.debug(f"has_valid_mfa: {valid_mfa_sso} (user={user}, last_login={last_login_date}")

    return valid_mfa_sso


def mfa_idp_allowed(user: User, entity_id : str=None):
    mfa_id_providers = current_app.app_config.mfa_idp_allowed
    entity_id_allowed = bool([idp for idp in mfa_id_providers if entity_id and idp.entity_id == entity_id.lower()])

    def schac_match(configured_schac_home, user_schac_home):
        schac_home_lower = user_schac_home.lower()
        return configured_schac_home == schac_home_lower or schac_home_lower.endswith(f".{configured_schac_home}")

    schac_home = user.schac_home_organisation
    schac_allowed = bool([idp for idp in mfa_id_providers if schac_home and schac_match(idp.schac_home, schac_home)])
    result = entity_id_allowed or schac_allowed

    logger = ctx_logger("user_api")
    logger.debug(f"mfa_idp_allowed: {result} (entity_id_allowed={entity_id_allowed}, "
                 f"schac_home_allowed={schac_allowed}, "
                 f"entity_id={entity_id}, schac_home={schac_home}")

    return result
