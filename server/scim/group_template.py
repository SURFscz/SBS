from typing import Union, List

from server.api.base import application_base_url
from server.db.domain import Group, Collaboration, CollaborationMembership
from server.scim import SCIM_URL_PREFIX, external_id_postfix
from server.scim.pagination import paginate_items
from server.scim.schema_template import SCIM_SCHEMA_CORE_GROUP, SCIM_API_MESSAGES
from server.scim.user_template import version_value, date_time_format, replace_none_values


def _meta_info(group: Union[Group, Collaboration]):
    return {"resourceType": "Group",
            "created": date_time_format(group.created_at),
            "lastModified": date_time_format(group.updated_at),
            "version": version_value(group),
            "location": f"/Groups/{group.identifier}{external_id_postfix()}"}


def create_group_template(group: Union[Group, Collaboration], membership_scim_objects):
    from server.scim.schema_template import get_scim_schema_sram_group

    def link(name: str, value: str):
        return {
            'name': name,
            'value': value
        }

    scim_sram_extension = {
        "description": group.description,
        "urn": group.global_urn
    }

    labels = [
        t.tag_value for t in group.tags
    ] if hasattr(group, 'tags') else []

    if len(labels) > 0:
        scim_sram_extension['labels'] = sorted(labels)

    links = []

    if isinstance(group, Collaboration):
        links.append(
            link('sbs_url', f"{application_base_url()}/collaborations/{group.identifier}")
        )
        links.append(
            link('logo', group.logo)
        )

    if len(links) > 0:
        scim_sram_extension['links'] = links

    sorted_members = sorted(membership_scim_objects, key=lambda m: m["value"])

    return replace_none_values({
        "schemas": [
            SCIM_SCHEMA_CORE_GROUP,
            get_scim_schema_sram_group()
        ],
        "externalId": f"{group.identifier}{external_id_postfix()}",
        "displayName": group.name,
        "members": sorted_members,
        get_scim_schema_sram_group(): scim_sram_extension
    })


def update_group_template(group: Union[Group, Collaboration], membership_scim_objects, scim_identifier: str):
    result = create_group_template(group, membership_scim_objects)
    result["id"] = scim_identifier
    return result


# This is used for internal SRAM groups and external SCIM providers
def scim_member_object(base_url, membership: CollaborationMembership, scim_object=None):
    member_value = f"{membership.user.external_id}{external_id_postfix()}"
    return {
        "value": scim_object["id"] if scim_object else member_value,
        "display": membership.user.name,
        "$ref": f"{base_url}{SCIM_URL_PREFIX}/Users/{member_value}"
    }


def find_group_by_id_template(group: Union[Group, Collaboration]):
    base_url = application_base_url()
    members = [scim_member_object(base_url, m) for m in group.collaboration_memberships if m.is_active()]
    group_template = update_group_template(group, members, f"{group.identifier}{external_id_postfix()}")
    group_template["meta"] = _meta_info(group)
    return group_template


def find_groups_template(groups: List[Union[Group, Collaboration]], start_index: int = 1, count: int = None):
    page_groups, total, items_per_page = paginate_items(groups, start_index, count)
    resources = [find_group_by_id_template(group) for group in page_groups]
    return {
        "schemas": [
            f"{SCIM_API_MESSAGES}:ListResponse"
        ],
        "totalResults": total,
        "startIndex": start_index,
        "itemsPerPage": items_per_page,
        "Resources": resources,
    }
