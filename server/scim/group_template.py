from typing import Union, List

from server.db.domain import Group, Collaboration
from server.scim import SCIM_URL_PREFIX
from server.scim.user_template import external_id_post_fix, version_value, date_time_format


def _meta_info(group: Union[Group, Collaboration]):
    return {"resourceType": "Group",
            "created": date_time_format(group.created_at),
            "lastModified": date_time_format(group.updated_at),
            "version": version_value(group),
            "location": f"{SCIM_URL_PREFIX}/Groups/{group.identifier}{external_id_post_fix}"}


def create_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers):
    return {
        "schemas": [
            "urn:scim:schemas:core:1.0"
        ],
        "externalId": f"{group.identifier}{external_id_post_fix}",
        "name": group.global_urn,
        "displayName": group.name,
        "members": [{"value": scim_id} for scim_id in membership_user_scim_identifiers]
    }


def update_group_template(group: Union[Group, Collaboration], membership_user_scim_identifiers, scim_identifier: str):
    result = create_group_template(group, membership_user_scim_identifiers)
    result["id"] = scim_identifier
    return result


def find_group_by_id_template(group: Union[Group, Collaboration]):
    members = [f"{m.user.external_id}{external_id_post_fix}" for m in group.collaboration_memberships if m.is_active]
    group_template = update_group_template(group, members, f"{group.identifier}{external_id_post_fix}")
    group_template["meta"] = _meta_info(group)
    return group_template


def find_groups_template(groups: List[Union[Group, Collaboration]]):
    base = {
        "schemas": [
            "urn:ietf:params:scim:api:messages:2.0:ListResponse"
        ],
        "totalResults": len(groups),
        "startIndex": 0,
        "itemsPerPage": len(groups),
    }
    resources = []
    for group in groups:
        resources.append(find_group_by_id_template(group))
    base["Resources"] = resources
    return base
