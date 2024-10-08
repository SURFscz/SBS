import base64
import hashlib
import datetime

from typing import List, Union

from server.db.domain import User, Group, Collaboration
from server.scim import EXTERNAL_ID_POST_FIX
from server.scim.schema_template import \
    SCIM_SCHEMA_CORE_USER, SCIM_SCHEMA_SRAM_USER, SCIM_API_MESSAGES


def replace_none_values(d: dict):
    for k, v in d.items():
        if isinstance(v, dict):
            replace_none_values(v)
        elif v is None:
            d[k] = ""
    return d


def version_value(scim_object: Union[User, Group, Collaboration]):
    return hashlib.sha256(bytes(str(int(scim_object.updated_at.timestamp())), "utf-8")).hexdigest()


def date_time_format(date_at):
    return date_at.strftime("%Y-%m-%dT%H:%M:%S")


def _meta_info(user: User):
    return {"resourceType": "User",
            "created": date_time_format(user.created_at),
            "lastModified": date_time_format(user.updated_at),
            "version": version_value(user),
            "location": f"/Users/{user.external_id}{EXTERNAL_ID_POST_FIX}"}


def inactive_days(date_at):
    today = datetime.date.today()
    delta = today - date_at.date()
    return delta.days


def create_user_template(user: User):

    return replace_none_values({
        "schemas": [
            SCIM_SCHEMA_CORE_USER,
            SCIM_SCHEMA_SRAM_USER
        ],
        "externalId": f"{user.external_id}{EXTERNAL_ID_POST_FIX}",
        "userName": user.username,
        "name": {
            "givenName": user.given_name,
            "familyName": user.family_name
        },
        "displayName": user.name,
        "active": not user.suspended,
        "emails": [{"value": user.email, "primary": True}],
        "x509Certificates": [{"value": base64.b64encode(ssh_key.ssh_value.encode()).decode()} for ssh_key in
                             user.ssh_keys],
        SCIM_SCHEMA_SRAM_USER: {
            "eduPersonScopedAffiliation": user.affiliation,
            "eduPersonUniqueId": user.uid,
            "voPersonExternalAffiliation": user.scoped_affiliation,
            "voPersonExternalId": user.eduperson_principal_name,
            "sramInactiveDays": inactive_days(user.last_login_date)
        }
    })


def update_user_template(user: User, scim_identifier: str):
    result = create_user_template(user)
    result["id"] = scim_identifier
    return result


def find_user_by_id_template(user: User):
    user_template = update_user_template(user, f"{user.external_id}{EXTERNAL_ID_POST_FIX}")
    user_template["meta"] = _meta_info(user)
    return user_template


def find_users_template(users: List[User]):
    base = {
        "schemas": [
            f"{SCIM_API_MESSAGES}:ListResponse"
        ],
        "totalResults": len(users),
        "startIndex": 0,
        "itemsPerPage": len(users),
    }
    resources = []
    for user in users:
        resources.append(find_user_by_id_template(user))
    base["Resources"] = resources
    return base
