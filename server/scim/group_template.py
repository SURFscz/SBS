# -*- coding: future_fstrings -*-
from typing import Union

from server.db.domain import Group, Collaboration


def create_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers):
    return {
        "schemas": [
            "urn:scim:schemas:core:1.0"
        ],
        "externalId": f"{group.identifier}@@sram.surf.nl",
        "name": group.global_urn,
        "displayName": group.name,
        "members": [{"value": scim_id} for scim_id in membership_user_scim_identifiers]
    }


def update_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers, scim_identifier: str):
    result = create_group_template(group, membership_user_scim_identifiers)
    result["id"] = scim_identifier
    return result
