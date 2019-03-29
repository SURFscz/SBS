from server.db.db import User

oidc_claim_name = "OIDC_CLAIM_name"

user_service_profile_claims = ["name", "email", "address", "ssh_key"]

claim_attribute_mapping = {
    oidc_claim_name: "name",
    "HTTP_OIDC_CLAIM_CMUID": "uid",
    "HTTP_OIDC_CLAIM_ADDRESS_STREET_ADDRESS": "address",
    "HTTP_OIDC_CLAIM_NICKNAME": "nick_name",
    "HTTP_OIDC_CLAIM_EDUMEMBER_IS_MEMBER_OF": "edu_members",
    "HTTP_OIDC_CLAIM_EDUPERSON_AFFILIATION": "affiliation",
    "HTTP_OIDC_CLAIM_EDUPERSON_SCOPED_AFFILIATION": "scoped_affiliation",
    "HTTP_OIDC_CLAIM_EDUPERSON_ENTITLEMENT": "entitlement",
    "HTTP_OIDC_CLAIM_SCHAC_HOME_ORGANISATION": "schac_home_organisation",
    "HTTP_OIDC_CLAIM_FAMILY_NAME": "family_name",
    "HTTP_OIDC_CLAIM_GIVEN_NAME": "given_name",
    "HTTP_OIDC_CLAIM_EMAIL": "email",
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
    "email": "urn:mace:dir:attribute-def:mail"
}

user_service_profile_saml_mapping = {**attribute_saml_mapping,
                                     "ssh_key": "urn:oid:1.3.6.1.4.1.24552.1.1.1.13"}


def claim_attribute_hash_headers(headers):
    claims = {key: headers.get(key) for key in claim_attribute_mapping.keys()}
    return hash(frozenset(claims.items()))


def claim_attribute_hash_user(user: User):
    claims = {key: getattr(user, value) for key, value in claim_attribute_mapping.items()}
    return hash(frozenset(claims.items()))
