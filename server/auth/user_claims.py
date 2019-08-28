# -*- coding: future_fstrings -*-
from flask import current_app

from server.api.base import ctx_logger
from server.db.db import User

oidc_claim_name = "name"

user_service_profile_claims = ["name", "email", "address"]

claim_attribute_mapping = {
    oidc_claim_name: "name",
    "cmuid": "uid",
    "address_street_address": "address",
    "nickname": "nick_name",
    "edumember_is_member_of": "edu_members",
    "eduperson_affiliation": "affiliation",
    "eduperson_scoped_affiliation": "scoped_affiliation",
    "eduperson_entitlement": "entitlement",
    "schac_home_organisation": "schac_home_organisation",
    "family_name": "family_name",
    "given_name": "given_name",
    "email": "email",
}

is_member_of_saml = "urn:mace:dir:attribute-def:isMemberOf"

attribute_saml_mapping = {
    "uid": "urn:mace:dir:attribute-def:uid",
    "name": "urn:mace:dir:attribute-def:cn",
    "address": "urn:mace:dir:attribute-def:postalAddress",
    "nick_name": "urn:mace:dir:attribute-def:displayName",
    "edu_members": is_member_of_saml,
    "affiliation": "urn:mace:dir:attribute-def:eduPersonAffiliation",
    "scoped_affiliation": "urn:mace:dir:attribute-def:eduPersonScopedAffiliation",
    "entitlement": "urn:mace:dir:attribute-def:eduPersonEntitlement",
    "schac_home_organisation": "urn:mace:terena.org:attribute-def:schacHomeOrganization",
    "family_name": "urn:mace:dir:attribute-def:sn",
    "given_name": "urn:mace:dir:attribute-def:givenName",
    "email": "urn:mace:dir:attribute-def:mail",
    "ssh_key": "urn:oid:1.3.6.1.4.1.24552.1.1.1.13"
}

user_service_profile_saml_mapping = {**attribute_saml_mapping}


def _get_header_key(key):
    prefix = current_app.app_config.oidc_prefix
    uppercase = current_app.app_config.oidc_uppercase
    res = prefix + (key if not uppercase else key.upper())
    return res


def _get_value(request_headers, key):
    logger = ctx_logger("user_claims")
    s = request_headers.get(key)
    if s is None:
        logger.debug(f"Returning None for key {key}")
        return None
    if current_app.config["LOCAL"]:
        return s
    res = bytes(s, "iso-8859-1").decode("utf-8")
    logger.debug(f"Returning {res} for key {key} with original value {s}")
    return res


def claim_attribute_hash_headers(headers):
    claims = {_get_header_key(key): _get_value(headers, _get_header_key(key)) for key in claim_attribute_mapping.keys()}
    return hash(frozenset(claims.items()))


def claim_attribute_hash_user(user: User):
    claims = {_get_header_key(key): getattr(user, value) for key, value in claim_attribute_mapping.items()}
    return hash(frozenset(claims.items()))


def add_user_claims(request_headers, uid, user):
    for key, attr in claim_attribute_mapping.items():
        setattr(user, attr, _get_value(request_headers, _get_header_key(key)))
    if _get_header_key(oidc_claim_name) not in request_headers:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else user.nick_name if user.nick_name else uid


def get_user_uid(request_headers):
    uid_key = _get_header_key(current_app.app_config.oidc_id)
    return _get_value(request_headers, uid_key)
