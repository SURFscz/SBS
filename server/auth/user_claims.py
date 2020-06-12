# -*- coding: future_fstrings -*-
import re

from flask import current_app

from server.api.base import ctx_logger

user_service_profile_claims = ["name", "email", "address"]

claim_attribute_mapping_value = None


def claim_attribute_mapping():
    global claim_attribute_mapping_value

    if not claim_attribute_mapping_value:
        claim_attribute_mapping_value = [
            {"name": "name"},
            {current_app.app_config.oidc_id.lower(): "uid"},
            {"address_street_address": "address"},
            {"nickname": "nick_name"},
            {"edumember_is_member_of": "edu_members"},
            {"eduperson_affiliation": "affiliation"},
            {current_app.app_config.voperson_application_uid.lower(): "application_uid"},
            {current_app.app_config.eduperson_principal_name.lower(): "eduperson_principal_name"},
            {current_app.app_config.eduperson_scoped_affiliation.lower(): "scoped_affiliation"},
            {"eduperson_entitlement": "entitlement"},
            {"schac_home_organisation": "schac_home_organisation"},
            {"family_name": "family_name"},
            {"given_name": "given_name"},
            {"email": "email"},
            {"uid": "username"}
        ]
    return claim_attribute_mapping_value


is_member_of_saml = "urn:mace:dir:attribute-def:isMemberOf"

multi_value_attributes = ["edu_members", "affiliation", "scoped_affiliation", "entitlement"]


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


def add_user_claims(request_headers, uid, user):
    for claim in claim_attribute_mapping():
        for key, attr in claim.items():
            setattr(user, attr, _get_value(request_headers, _get_header_key(key)))
    if not user.name:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else user.nick_name if user.nick_name else uid
    if not user.schac_home_organisation and user.scoped_affiliation:
        parts = re.split("[@|.]", user.scoped_affiliation)[-2:]
        user.schac_home_organisation = ".".join(parts)


def get_user_uid(request_headers):
    uid_key = _get_header_key(current_app.app_config.oidc_id)
    return _get_value(request_headers, uid_key)


def get_user_eppn(request_headers):
    eduperson_principal_name_key = _get_header_key(current_app.app_config.eduperson_principal_name)
    return _get_value(request_headers, eduperson_principal_name_key)
