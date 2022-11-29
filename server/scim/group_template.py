from typing import Union, List

from server.api.base import application_base_url
from server.db.domain import Group, Collaboration, CollaborationMembership
from server.scim import SCIM_URL_PREFIX
from server.scim.user_template import external_id_post_fix, version_value, date_time_format, replace_none_values


def _meta_info(group: Union[Group, Collaboration]):
    return {"resourceType": "Group",
            "created": date_time_format(group.created_at),
            "lastModified": date_time_format(group.updated_at),
            "version": version_value(group),
            "location": f"{SCIM_URL_PREFIX}/Groups/{group.identifier}{external_id_post_fix}"}


def create_group_template(group: Union[Group, Collaboration], membership_scim_objects):
    return replace_none_values({
        "schemas": [
            "urn:scim:schemas:core:1.0"
        ],
        "externalId": f"{group.identifier}{external_id_post_fix}",
        "name": group.global_urn,
        "displayName": group.name,
        "members": membership_scim_objects
    })


def update_group_template(group: Union[Group, Collaboration], membership_scim_objects, scim_identifier: str):
    result = create_group_template(group, membership_scim_objects)
    result["id"] = scim_identifier
    return result


def scim_member_object(base_url, membership: CollaborationMembership):
    member_value = f"{membership.user.external_id}{external_id_post_fix}"
    return {
        "value": member_value,
        "display": membership.user.name,
        "$ref": f"{base_url}{SCIM_URL_PREFIX}/Users/{member_value}"
    }


def find_group_by_id_template(group: Union[Group, Collaboration]):
    base_url = application_base_url()
    members = [scim_member_object(base_url, m) for m in group.collaboration_memberships if m.is_active]
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
