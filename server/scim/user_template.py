# -*- coding: future_fstrings -*-
from typing import List

from server.db.domain import User

external_id_post_fix = "@sram.surf.nl"


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
        user_template = create_user_template(user)
        user_template["meta"] = {"resourceType": "User",
                                 "created": user.created_at.strftime("%Y-%m-%dT%H:%M:%S"),
                                 "lastModified": user.updated_at.strftime("%Y-%m-%dT%H:%M:%S"),
                                 "location": f"/Users/{user.external_id}{external_id_post_fix}"}
        resources.append(user_template)
    base["Resources"] = resources
    return base
