import json
from datetime import datetime, timedelta

import jwt
import requests
from flask import current_app, session
from jwt import algorithms

from server.auth.secrets import generate_token
from server.auth.security import is_admin_user, CSRF_TOKEN
from server.db.domain import Organisation, SchacHomeOrganisation
from server.logger.context_logger import ctx_logger

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
        "email": user.email
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
                user_information.append(membership.user)
    if not user_information:
        for coll_membership in user.collaboration_memberships:
            for membership in coll_membership.collaboration.collaboration_memberships:
                if membership.role == "admin" and membership.user != user:
                    user_information.append(membership.user)
    if not user_information:
        for membership in user.collaboration_memberships:
            for mb in membership.collaboration.organisation.organisation_memberships:
                if mb.user != user:
                    user_information.append(mb.user)

    if not user_information and user.schac_home_organisation:
        organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
        if organisations:
            org = Organisation.query.get(organisations[0].id)
            for membership in org.organisation_memberships:
                if membership.user != user:
                    user_information.append(membership.user)

    user_information = [{"name": u.name, "email": u.email} for u in user_information]
    if not user_information:
        user_information.append({"name": "SRAM support", "email": current_app.app_config.mail.info_email})

    return user_information


def _idp_configured(identity_providers, action, schac_home=None, entity_id=None):
    entity_id_allowed = entity_id and [idp for idp in identity_providers if idp.entity_id == entity_id.lower()]

    def schac_match(configured_schac_home, schac_home):
        schac_home_lower = schac_home.lower()
        return configured_schac_home == schac_home_lower or schac_home_lower.endswith(f".{configured_schac_home}")

    schac_home_allowed = schac_home and [idp for idp in identity_providers if schac_match(idp.schac_home, schac_home)]

    result = entity_id_allowed or schac_home_allowed

    logger = ctx_logger("user_api")
    logger.debug(f"{action}: {result} (entity_id_allowed={entity_id_allowed}, "
                 f"schac_home_allowed={schac_home_allowed}, "
                 f"entity_id={entity_id}, schac_home={schac_home}")

    return bool(result)


def has_valid_mfa(user):
    last_login_date = user.last_login_date
    login_sso_cutoff = timedelta(hours=0, minutes=int(current_app.app_config.mfa_sso_time_in_minutes))
    valid_mfa_sso = last_login_date and datetime.now() - user.last_login_date < login_sso_cutoff

    logger = ctx_logger("user_api")
    logger.debug(f"has_valid_mfa: {valid_mfa_sso} (user={user}, last_login={last_login_date}")

    return valid_mfa_sso


def mfa_idp_allowed(schac_home=None, entity_id=None):
    allowed_identity_providers = current_app.app_config.mfa_idp_allowed
    return _idp_configured(allowed_identity_providers, "mfa_idp_allowed", schac_home, entity_id)


def surf_secure_id_required(schac_home=None, entity_id=None):
    ssid_identity_providers = current_app.app_config.ssid_identity_providers
    return _idp_configured(ssid_identity_providers, "surf_secure_id_required", schac_home, entity_id)
