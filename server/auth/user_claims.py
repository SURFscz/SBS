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
}


def claim_attribute_hash_headers(headers):
    claims = {key: headers.get(key) for key in claim_attribute_mapping.keys()}
    return hash(frozenset(claims.items()))


def claim_attribute_hash_user(user: User):
    claims = {key: getattr(user, value) for key, value in claim_attribute_mapping.items()}
    return hash(frozenset(claims.items()))
