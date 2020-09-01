# -*- coding: future_fstrings -*-
import re

claim_attribute_mapping_value = None


def claim_attribute_mapping():
    global claim_attribute_mapping_value
    if not claim_attribute_mapping_value:
        claim_attribute_mapping_value = [
            {"sub": "uid"},
            {"name": "name"},
            {"given_name": "given_name"},
            {"email": "email"},
            {"family_name": "family_name"},
            {"eduperson_scoped_affiliation": "scoped_affiliation"},
            {"eduperson_affiliation": "affiliation"},
            {"eduperson_principal_name": "eduperson_principal_name"},
            {"eduperson_entitlement": "entitlement"},
            {"schac_home_organization": "schac_home_organisation"},
            {"ssh_public_key": "ssh_key"},
            {"voperson_application_uid": "application_uid"},
            {"eduperson_principal_name": "username"}
        ]
    return claim_attribute_mapping_value


def add_user_claims(user_info_json, uid, user):
    for claim in claim_attribute_mapping():
        for key, attr in claim.items():
            val = user_info_json.get(key)
            if val and isinstance(val, list):
                val = ", ".join(val)
            setattr(user, attr, val)
    if not user.name:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else uid
    if not user.schac_home_organisation and user.scoped_affiliation:
        parts = re.split("[@|.]", user.scoped_affiliation)[-2:]
        user.schac_home_organisation = ".".join(parts)
    if user.username:
        # We need to parse the user.username if present to remove the @domain
        index = user.username.find("@")
        index = index if index > 0 else len(user.username)
        user.username = user.username[0:index]
