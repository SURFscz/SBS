# -*- coding: future_fstrings -*-
import copy
from typing import Union

from server.db.domain import Group, Collaboration

group_template = {
    "schemas": [
        "urn:scim:schemas:core:1.0"
    ],
    "externalId": "7a681258-2107-4e1b-8069-7ab1cd20d513@sram.surf.nl",
    "name": "ucc:storage",
    "displayName": "Storage",
    "members": [
        {"value": "7a681258-2107-4e1b-8069-7ab1cd20d513@sram.surf.nl"}
    ]
}


def create_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers):
    result = copy.deepcopy(group_template)
    result["externalId"] = f"{group.identifier}@@sram.surf.nl"
    result["name"] = group.global_urn
    result["displayName"] = group.name
    result["members"] = [{"value": scim_id} for scim_id in membership_user_scim_identifiers]
    return result


def update_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers, scim_identifier: str):
    result = create_group_template(group, membership_user_scim_identifiers)
    result["id"] = scim_identifier
    return result
