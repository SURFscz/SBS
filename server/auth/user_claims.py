# -*- coding: future_fstrings -*-
import random
import re
import string
import unicodedata

from server.db.domain import User

claim_attribute_mapping_value = None


def claim_attribute_mapping():
    global claim_attribute_mapping_value
    if not claim_attribute_mapping_value:
        claim_attribute_mapping_value = [
            {"sub": "uid"},
            {"name": "name"},
            {"given_name": "given_name"},
            {"family_name": "family_name"},
            {"email": "email"},
            {"eduperson_scoped_affiliation": "scoped_affiliation"},
            {"voperson_external_affiliation": "affiliation"},
            {"eduperson_entitlement": "entitlement"},
            {"eduperson_principal_name": "eduperson_principal_name"}
        ]
    return claim_attribute_mapping_value


def _normalize(s):
    if s is None:
        return ""
    normalized = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("utf-8").strip()
    return re.sub("[^a-zA-Z]", "", normalized)


def generate_unique_username(user: User, max_count=10000):
    if hasattr(user, "eduperson_principal_name") and user.eduperson_principal_name:
        eduperson_principal_name = re.split("@", user.eduperson_principal_name)[0]
        username = f"{_normalize(eduperson_principal_name)}".lower()
    else:
        username = f"{_normalize(user.given_name)[0:1]}{_normalize(user.family_name)[0:11]}"[0:10].lower()

    if len(username) == 0:
        username = "u"
    counter = 2
    generated_user_name = username
    while True and counter < max_count:
        if User.query.filter(User.username == generated_user_name).count() == 0:
            return generated_user_name
        generated_user_name = f"{username}{counter}"
        counter = counter + 1
    # Try remembering that...
    return "".join(random.sample(string.ascii_lowercase, k=14))


def add_user_claims(user_info_json, uid, user, replace_none_values=True):
    for claim in claim_attribute_mapping():
        for key, attr in claim.items():
            val = user_info_json.get(key)
            if val and isinstance(val, list):
                val = ", ".join(val)
            if val or replace_none_values:
                setattr(user, attr, val)
    if not user.name:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else uid
    if "voperson_external_id" in user_info_json:
        voperson_external_id = user_info_json["voperson_external_id"]
        val = voperson_external_id[0] if isinstance(voperson_external_id, list) else val
        parts = re.split("[@|.]", val)[-2:]
        user.schac_home_organisation = ".".join(parts)
    if not user.username:
        user.username = generate_unique_username(user)
