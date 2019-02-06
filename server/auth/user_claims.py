from server.db.db import User

claim_attribute_mapping = {
    "Oidc-Claim-Cmuid": "uid",
    "Oidc-Claim-Nickname": "nick_name",
    "Oidc-Claim-Edumember-Is-Member-Of": "edu_members",
    "Oidc-Claim-Eduperson-Affiliation": "affiliation",
    "Oidc-Claim-Schac-Home-Organisation": "schac_home_organisation",
    "Oidc-Claim-Family-Name": "family_name",
    "Oidc-Claim-Given-Name": "given_name",
    "Oidc-Claim-Email": "email",
}


def claim_attribute_hash_headers(headers):
    claims = {key: headers.get(key) for key in claim_attribute_mapping.keys()}
    return hash(frozenset(claims.items()))


def claim_attribute_hash_user(user: User):
    claims = {key: getattr(user, value) for key, value in claim_attribute_mapping.items()}
    return hash(frozenset(claims.items()))
