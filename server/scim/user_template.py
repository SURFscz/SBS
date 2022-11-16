import hashlib
from typing import List, Union

from server.db.domain import User, Group, Collaboration
from server.scim import SCIM_URL_PREFIX

external_id_post_fix = "@sram.surf.nl"


def version_value(scim_object: Union[User, Group, Collaboration]):
    return hashlib.sha256(bytes(str(int(scim_object.updated_at.timestamp())), "utf-8")).hexdigest()


def date_time_format(date_at):
    return date_at.strftime("%Y-%m-%dT%H:%M:%S")


def _meta_info(user: User):
    return {"resourceType": "User",
            "created": date_time_format(user.created_at),
            "lastModified": date_time_format(user.updated_at),
            "version": version_value(user),
            "location": f"{SCIM_URL_PREFIX}/Users/{user.external_id}{external_id_post_fix}"}


def create_user_template(user: User):
    return {
        "schemas": [
            "urn:scim:schemas:core:1.0"
        ],
        "externalId": f"{user.external_id}{external_id_post_fix}",
        "userName": user.username,
        "name": {
            "givenName": user.given_name,
            "familyName": user.family_name
        },
        "displayName": user.name,
        "active": not user.suspended,
        "emails": [{"value": user.email, "primary": True}],
        "x509Certificates": [{"value": ssh_key.ssh_value} for ssh_key in user.ssh_keys]
    }


def update_user_template(user: User, scim_identifier: str):
    result = create_user_template(user)
    result["id"] = scim_identifier
    return result


def find_user_by_id_template(user: User):
    user_template = update_user_template(user, f"{user.external_id}{external_id_post_fix}")
    user_template["meta"] = _meta_info(user)
    return user_template


def find_users_template(users: List[User]):
    base = {
        "schemas": [
            "urn:ietf:params:scim:api:messages:2.0:ListResponse"
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
