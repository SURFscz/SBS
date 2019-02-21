from server.db.db import User

user_service_profile_claims = ["name", "email", "address"]

claim_attribute_mapping = {
    "Oidc-Claim-Cmuid": "uid",
    "Oidc-Claim-Name": "name",
    "Oidc-Claim-Address-Street-Address": "address",
    "Oidc-Claim-Nickname": "nick_name",
    "Oidc-Claim-Edumember-Is-Member-Of": "edu_members",
    "Oidc-Claim-Eduperson-Affiliation": "affiliation",
    "Oidc-Claim-Eduperson-Scoped-Affiliation": "scoped_affiliation",
    "Oidc-Claim-Eduperson-Entitlement": "entitlement",
    "Oidc-Claim-Schac-Home-Organisation": "schac_home_organisation",
    "Oidc-Claim-Family-Name": "family_name",
    "Oidc-Claim-Given-Name": "given_name",
    "Oidc-Claim-Email": "email",
}
attribute_oidc_mapping = {
    "uid": "uid",
    "name": "cn",
    "address": "address",
    "nick_name": "displayName",
    "edu_members": "isMemberOf",
    "affiliation": "eduPersonAffiliation",
    "scoped_affiliation": "eduPersonScopedAffiliation",
    "entitlement": "eduPersonEntitlement",
    "schac_home_organisation": "schacHomeOrganization",
    "family_name": "surname",
    "given_name": "givenname",
    "email": "mail",
}


def claim_attribute_hash_headers(headers):
    claims = {key: headers.get(key) for key in claim_attribute_mapping.keys()}
    return hash(frozenset(claims.items()))


def claim_attribute_hash_user(user: User):
    claims = {key: getattr(user, value) for key, value in claim_attribute_mapping.items()}
    return hash(frozenset(claims.items()))
