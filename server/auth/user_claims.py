from __future__ import annotations

import os
import random
import re
import string
import unicodedata
import uuid
from typing import Iterator

from flask import current_app

from server.db.defaults import STATUS_SUSPENDED
from server.db.domain import User, UserNameHistory, Collaboration
from server.logger.context_logger import ctx_logger
from server.mail import mail_error
from server.tools import dt_now

claim_attribute_mapping_value = [
    {"sub": "uid"},
    {"sub": "collab_person_id"},
    {"name": "name"},
    {"given_name": "given_name"},
    {"family_name": "family_name"},
    {"email": "email"},
    {"voperson_external_affiliation": "scoped_affiliation"},
    {"eduperson_scoped_affiliation": "affiliation"},
    {"eduperson_entitlement": "entitlement"},
    {"voperson_external_id": "eduperson_principal_name"},
    # EB / OIDC-NG claim
    {"eduperson_affiliation": "affiliation"},
    {"eduperson_principal_name": "eduperson_principal_name"},
    {"schac_home_organization": "schac_home_organisation"}
]


def _normalize(s):
    if s is None:
        return ""
    normalized = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("utf-8").strip()
    return re.sub("[^a-zA-Z]", "", normalized)


def generate_unique_username(user: User, max_count=10000):
    username = f"{_normalize(user.given_name)[0:1]}{_normalize(user.family_name)[0:11]}"[0:10].lower()
    if len(username) == 0:
        username = "u"
    counter = 2
    generated_user_name = username
    while True and counter < max_count:
        unique_user_name = User.query.filter(User.username == generated_user_name).count() == 0
        unique_history = UserNameHistory.query.filter(UserNameHistory.username == generated_user_name).count() == 0
        if unique_user_name and unique_history:
            return generated_user_name
        generated_user_name = f"{username}{counter}"
        counter = counter + 1
    # Try remembering that...
    return "".join(random.sample(string.ascii_lowercase, k=14))


def add_user_claims(user_info_json, uid, user):
    cleared_attributes = []
    for claim in claim_attribute_mapping_value:
        for key, attr in claim.items():
            add_user_info_attr(attr, cleared_attributes, key, user, user_info_json)
    if not user_info_json.get("voperson_external_affiliation"):
        add_user_info_attr("scoped_affiliation", cleared_attributes, "eduperson_scoped_affiliation", user,
                           user_info_json)
    if not user.name:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else uid

    # SURFConext provides us with the schac_home_organization, eduTeams not
    if not user_info_json.get("schac_home_organization"):
        for attr in ["voperson_external_id", "voperson_external_affiliation"]:
            if attr in user_info_json and user_info_json[attr]:
                attr_value = user_info_json[attr]
                val = attr_value[0] if isinstance(attr_value, list) else attr_value
                if "@" in val:
                    schac_home = re.split("@", val)[-1]
                    if schac_home:
                        user.schac_home_organisation = schac_home.lower()
                        break
    if not user.username:
        user.username = generate_unique_username(user)
    if not user.external_id:
        user.external_id = str(uuid.uuid4())
    if cleared_attributes:
        msg = f"Previously set attributes {cleared_attributes} for user {uid} is cleared in user_info"
        ctx_logger("base").exception(msg)
        mail_conf = current_app.app_config.mail
        if not os.environ.get("TESTING"):
            mail_error(mail_conf.environment, uid, mail_conf.send_exceptions_recipients, msg)


# Because we migrate to EB, we must ignore the EB attributes
# See https://github.com/SURFscz/SBS/issues/1900
ignore_cleared_attributes = ["scoped_affiliation", "affiliation", "eduperson_principal_name", "schac_home_organisation"]


def add_user_info_attr(attr, cleared_attributes, key, user, user_info_json):
    val = user_info_json.get(key)
    if isinstance(val, list):
        val = ", ".join(val) if val else None
    if (key not in user_info_json or val == "") and getattr(user, attr) and attr not in ignore_cleared_attributes:
        cleared_attributes.append(attr)
    if val or (val is None and key in user_info_json and attr not in ["uid", "name", "email"]):
        setattr(user, attr, val)


# return all active (non-expired/suspended) collaboration from the list
def _active_collaborations(collaborations: Iterator[Collaboration]) -> Iterator[Collaboration]:
    now = dt_now()
    for collaboration in collaborations:
        not_expired = not collaboration.expiry_date or collaboration.expiry_date > now
        if not_expired and collaboration.status != STATUS_SUSPENDED:
            yield collaboration


def user_memberships(user, connected_collaborations):
    cfg = current_app.app_config
    namespace = cfg.get("entitlement_group_namespace", "urn:bla")

    # gather groups and collaborations
    #
    # we're (partially) adhering to AARC's Guidelines on expressing group membership and role information
    # (see https://aarc-project.eu/guidelines/aarc-g002/)
    # Which prescribes group/co membership need to be expressed as entitlements of the form
    # <NAMESPACE>:group:<GROUP>[:<SUBGROUP>*][:role=<ROLE>]#<GROUP-AUTHORITY>
    # The namespace is defined in the config file (variable entitlement_group_namespace)
    # COs map to GROUP and Groups map to SUBGROUP
    # We don't use roles, so we omit those.
    # Also, we omit the GROUP-AUTHORITY (and are therefore not completely compliant), as it complicates parsing the
    # entitlement, will confuse Services, and the spec fails to make clear what the usecase is, exactly.
    memberships = set()
    for collaboration in _active_collaborations(connected_collaborations):
        # add the CO itself, the Organisation this CO belongs to, and the groups within the CO
        org_short_name = collaboration.organisation.short_name
        coll_short_name = collaboration.short_name

        memberships.add(f"{namespace}:group:{org_short_name}")
        memberships.add(f"{namespace}:group:{org_short_name}:{coll_short_name}")
        for g in collaboration.groups:
            if g.is_member(user.id):
                memberships.add(f"{namespace}:group:{org_short_name}:{coll_short_name}:{g.short_name}")
    return memberships


def co_tags(connected_collaborations: list[Collaboration]) -> set[str]:
    cfg = current_app.app_config
    namespace = cfg.get("entitlement_group_namespace", "urn:bla")

    tags = set()
    for collaboration in _active_collaborations(connected_collaborations):
        co_name = collaboration.short_name
        org_name = collaboration.organisation.short_name
        for tag in collaboration.tags:
            tags.add(f"{namespace}:label:{org_name}:{co_name}:{tag.tag_value}")

    return tags


def valid_user_attributes(attributes):
    missing_attributes = []
    if "name" not in attributes and "given_name" in attributes and "family_name" in attributes:
        attributes["name"] = f"{attributes.get('given_name').strip()} {attributes.get('family_name').strip()}"
    for attr in ["sub", "email", "name"]:
        if attr not in attributes or not attributes.get(attr):
            missing_attributes.append(attr)
    if missing_attributes:
        msg = f"Missing attributes for user {attributes}"
        ctx_logger("base").exception(msg)
        mail_conf = current_app.app_config.mail
        if not os.environ.get("TESTING"):
            user_id = attributes.get("email") or attributes.get("name") or attributes.get("sub") or attributes
            mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, msg)
    return not bool(missing_attributes)
