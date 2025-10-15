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
    oidc_config = current_app.app_config.oidc
    jwks_endpoint = oidc_config.jwks_endpoint
    jwks = requests.get(jwks_endpoint, verify=oidc_config.verify_peer).json()

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
    # First we try to find collaboration admins
    for coll_membership in user.collaboration_memberships:
        for membership in coll_membership.collaboration.collaboration_memberships:
            if membership.role == "admin" and membership.user != user:
                user_information.append({"user": membership.user, "unit": membership.collaboration.name})
    if not user_information:
        # Second we try to find organization managers with the same unit as the CO
        collaborations_with_units = [m.collaboration for m in user.collaboration_memberships if m.collaboration.units]
        for co in collaborations_with_units:
            for m in co.organisation.organisation_memberships:
                if m.role == "manager" and m.units and all(u in co.units for u in m.units) and m.user != user:
                    user_information.append({"user": m.user, "unit": m.organisation.name})
    if not user_information:
        # Third we try to find organization managers without any units
        all_collaborations = [m.collaboration for m in user.collaboration_memberships]
        for co in all_collaborations:
            for m in co.organisation.organisation_memberships:
                if m.role == "manager" and not m.units and m.user != user:
                    user_information.append({"user": m.user, "unit": m.organisation.name})
    if not user_information:
        # Fourth we try to find organization admins
        all_collaborations = [m.collaboration for m in user.collaboration_memberships]
        for co in all_collaborations:
            for m in co.organisation.organisation_memberships:
                if m.role == "admin" and m.user != user:
                    user_information.append({"user": m.user, "unit": m.organisation.name})
    if not user_information and user.schac_home_organisation:
        # Fifth we try to find organization managers of the same schac_home
        organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
        if organisations:
            org = db.session.get(Organisation, organisations[0].id)
            for membership in org.organisation_memberships:
                if membership.role == "manager" and membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.organisation.name})
    if not user_information:
        for org_membership in user.organisation_memberships:
            for membership in org_membership.organisation.organisation_memberships:
                if membership.role == "manager" and membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.organisation.name})
    if not user_information and user.schac_home_organisation:
        # Sixth we try to find organization admins of the same schac_home
        organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
        if organisations:
            org = db.session.get(Organisation, organisations[0].id)
            for membership in org.organisation_memberships:
                if membership.role == "admin" and membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.organisation.name})
    if not user_information:
        for org_membership in user.organisation_memberships:
            for membership in org_membership.organisation.organisation_memberships:
                if membership.role == "admin" and membership.user != user:
                    user_information.append({"user": membership.user, "unit": membership.organisation.name})

    user_info = [{"name": u["user"].name, "email": u["user"].email, "unit": u["unit"]} for u in user_information]
    # Final fallback is the configured mail
    if not user_info:
        # Empty strings will be translated client side
        user_info.append({"name": "", "email": current_app.app_config.mail.info_email, "unit": ""})
    unique_user_info = list({d["email"]: d for d in user_info}.values())
    return unique_user_info


def has_valid_mfa(user):
    last_login_date = user.last_login_date
    login_sso_cutoff = timedelta(hours=0, minutes=int(current_app.app_config.mfa_sso_time_in_minutes))
    valid_mfa_sso = last_login_date and (dt_now() - last_login_date < login_sso_cutoff)

    logger = ctx_logger("user_api")
    logger.debug(f"valid_mfa_sso: {valid_mfa_sso} (user={user.uid}, last_login={last_login_date}")

    return valid_mfa_sso


def mfa_idp_allowed(user: User, entity_id: str = None):
    identity_providers = current_app.app_config.mfa_idp_allowed
    entity_id_allowed = entity_id and [
        idp for idp in identity_providers if "entity_id" in idp and idp.entity_id.lower() == entity_id.lower()
    ]

    def schac_match(configured_schac_homes: list[str], user_schac_home: str) -> bool:
        schac_home_lower = user_schac_home.lower()
        for configured_schac_home in configured_schac_homes:
            if configured_schac_home == schac_home_lower or schac_home_lower.endswith(f".{configured_schac_home}"):
                return True
        return False

    schac_home = user.schac_home_organisation
    schac_home_allowed = schac_home and [
        idp for idp in identity_providers if "schac_home" in idp and schac_match(idp.schac_home, schac_home)
    ]
    result = bool(entity_id_allowed or schac_home_allowed)

    logger = ctx_logger("user_api")
    logger.debug(f"mfa_idp_allowed: {result} (entity_id_allowed={entity_id_allowed}, "
                 f"schac_home_allowed={schac_home_allowed}, "
                 f"entity_id={entity_id}, schac_home={schac_home}")

    return result


def user_requires_sram_mfa(user: User, issuer_id: str = None, override_mfa_required=False):
    # If the IdP already performed MFA proven by the ACR value
    idp_allowed_mfa_by_config = mfa_idp_allowed(user, issuer_id)
    # For Users who used to need TOTP-MFA, but who have moved to institutional MFA, we remove the TOTP secret
    if idp_allowed_mfa_by_config and user.second_factor_auth:
        logger = ctx_logger("user_api")
        logger.debug(f"user_requires_sram_mfa: removing TOTP token because users logs in with MFA IdP ("
                     f"user={user.uid}, "
                     f"entity_id={issuer_id}, schac_home={user.schac_home_organisation})")

        user.second_factor_auth = None
        db.session.merge(user)
        db.session.commit()
    idp_mfa_allowed = not override_mfa_required and idp_allowed_mfa_by_config
    fallback_required = current_app.app_config.mfa_fallback_enabled
    mfa_required = not override_mfa_required and fallback_required and not has_valid_mfa(user) and not idp_mfa_allowed
    return mfa_required
