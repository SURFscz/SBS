# -*- coding: future_fstrings -*-
import copy

from server.db.domain import User

user_template = {
    "schemas": [
        "urn:scim:schemas:core:1.0"
    ],
    "externalId": "7a681258-2107-4e1b-8069-7ab1cd20d513@sram.surf.nl",
    "userName": "jdoe",
    "name": {
        "givenName": "John",
        "familyName": "Doe"
    },
    "displayName": "jdoe",
    "active": True,
    "emails": [
        {
            "value": "jdoe@surf.nl",
            "primary": True
        }
    ],
    "x509Certificates": [
        {
            "value": "QUFBQUIz..."
        }
    ]
}


def create_user_template(user: User):
    result = copy.deepcopy(user_template)
    result["externalId"] = f"{user.external_id}@@sram.surf.nl"
    result["name"] = {"givenName": user.given_name, "familyName": user.family_name}
    result["displayName"] = user.name
    result["active"] = not user.suspended
    result["emails"] = [{"value": user.email, "primary": True}]
    result["x509Certificates"] = [{"value": ssh_key.ssh_value} for ssh_key in user.ssh_keys]
    return result


def update_user_template(user: User, scim_identifier: str):
    result = create_user_template(user)
    result["id"] = scim_identifier
    return result
