import datetime
import random
import re
import string
import unicodedata

from flask import current_app

from server.db.defaults import STATUS_SUSPENDED
from server.db.domain import User, UserNameHistory

claim_attribute_mapping_value = [
    {"sub": "uid"},
    {"name": "name"},
    {"given_name": "given_name"},
    {"family_name": "family_name"},
    {"email": "email"},
    {"voperson_external_affiliation": "scoped_affiliation"},
    {"eduperson_scoped_affiliation": "affiliation"},
    {"eduperson_entitlement": "entitlement"},
    {"voperson_external_id": "eduperson_principal_name"}
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


def add_user_claims(user_info_json, uid, user, replace_none_values=True):
    for claim in claim_attribute_mapping_value:
        for key, attr in claim.items():
            val = user_info_json.get(key)
            if isinstance(val, list):
                val = ", ".join(val) if val else None
            if val or replace_none_values:
                setattr(user, attr, val)
    if not user.name:
        name = " ".join(list(filter(lambda x: x, [user.given_name, user.family_name]))).strip()
        user.name = name if name else uid
    if "voperson_external_id" in user_info_json and user_info_json["voperson_external_id"]:
        voperson_external_id = user_info_json["voperson_external_id"]
        val = voperson_external_id[0] if isinstance(voperson_external_id, list) else voperson_external_id
        if "@" in val:
            schac_home = re.split("@", val)[-1]
            if schac_home:
                user.schac_home_organisation = schac_home
    if not user.username:
        user.username = generate_unique_username(user)


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
    now = datetime.datetime.utcnow()
    for collaboration in connected_collaborations:
        not_expired = not collaboration.expiry_date or collaboration.expiry_date > now
        if not_expired and collaboration.status != STATUS_SUSPENDED:
            # add the CO itself, the Organisation this CO belongs to, and the groups within the CO
            org_short_name = collaboration.organisation.short_name
            coll_short_name = collaboration.short_name

            memberships.add(f"{namespace}:group:{org_short_name}")
            memberships.add(f"{namespace}:group:{org_short_name}:{coll_short_name}")
            for g in collaboration.groups:
                if g.is_member(user.id):
                    memberships.add(f"{namespace}:group:{org_short_name}:{coll_short_name}:{g.short_name}")
    return memberships


def collaboration_memberships_for_service(user, service):
    memberships = []
    now = datetime.datetime.utcnow()
    if user and service:
        for cm in user.collaboration_memberships:
            co_expired = cm.collaboration.expiry_date and cm.collaboration.expiry_date < now
            cm_expired = cm.expiry_date and cm.expiry_date < now
            if not co_expired and not cm_expired:
                connected = list(filter(lambda s: s.id == service.id, cm.collaboration.services))
                if connected or list(filter(lambda s: s.id == service.id, cm.collaboration.organisation.services)):
                    memberships.append(cm)
    return memberships
