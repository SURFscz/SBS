from typing import Union, List

from server.api.base import application_base_url
from server.db.domain import Group, Collaboration, CollaborationMembership
from server.scim import SCIM_URL_PREFIX, EXTERNAL_ID_POST_FIX
from server.scim.user_template import version_value, date_time_format, replace_none_values
from server.scim.schema_template import \
    SCIM_SCHEMA_CORE_GROUP, SCIM_SCHEMA_SRAM_GROUP, SCIM_API_MESSAGES


def _meta_info(group: Union[Group, Collaboration]):
    return {"resourceType": "Group",
            "created": date_time_format(group.created_at),
            "lastModified": date_time_format(group.updated_at),
            "version": version_value(group),
            "location": f"/Groups/{group.identifier}{EXTERNAL_ID_POST_FIX}"}


def create_group_template(group: Union[Group, Collaboration], membership_scim_objects):

    labels = [
        t.tag_value for t in group.tags
    ] if hasattr(group, 'tags') else []

    sorted_members = sorted(membership_scim_objects, key=lambda m: m["value"])

    return replace_none_values({
        "schemas": [
            SCIM_SCHEMA_CORE_GROUP,
            SCIM_SCHEMA_SRAM_GROUP
        ],
        "externalId": f"{group.identifier}{EXTERNAL_ID_POST_FIX}",
        "displayName": group.name,
        "members": sorted_members,
        SCIM_SCHEMA_SRAM_GROUP: {
            "description": group.description,
            "urn": group.global_urn,
            "labels": labels
        }
    })


def update_group_template(group: Union[Group, Collaboration], membership_scim_objects, scim_identifier: str):
    result = create_group_template(group, membership_scim_objects)
    result["id"] = scim_identifier
    return result


# This is used for internal SRAM groups and external SCIM providers
def scim_member_object(base_url, membership: CollaborationMembership, scim_object=None):
    member_value = f"{membership.user.external_id}{EXTERNAL_ID_POST_FIX}"
    return {
        "value": scim_object["id"] if scim_object else member_value,
        "display": membership.user.name,
        "$ref": f"{base_url}{SCIM_URL_PREFIX}/Users/{member_value}"
    }


def find_group_by_id_template(group: Union[Group, Collaboration]):
    base_url = application_base_url()
    members = [scim_member_object(base_url, m) for m in group.collaboration_memberships if m.is_active]
    group_template = update_group_template(group, members, f"{group.identifier}{EXTERNAL_ID_POST_FIX}")
    group_template["meta"] = _meta_info(group)
    return group_template


def find_groups_template(groups: List[Union[Group, Collaboration]]):
    base = {
        "schemas": [
            f"{SCIM_API_MESSAGES}:ListResponse"
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
