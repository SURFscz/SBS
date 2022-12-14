import base64
from typing import List, Union

import requests

from server.api.base import application_base_url
from server.db.domain import Service, Group, User, Collaboration
from server.scim import EXTERNAL_ID_POST_FIX, SCIM_GROUPS, SCIM_USERS
from server.scim.group_template import create_group_template, update_group_template, scim_member_object
from server.scim.repo import all_scim_groups_by_service, all_scim_users_by_service
from server.scim.scim import scim_headers, validate_response
from server.scim.user_template import create_user_template, replace_none_values, update_user_template


def replace_empty_string_values(d: dict):
    for k, v in d.items():
        if isinstance(v, dict):
            replace_empty_string_values(v)
        elif v == "":
            d[k] = None
    return d


def _user_changed(user: User, remote_user: dict):
    if remote_user.get("userName") != user.username:
        return True
    if remote_user.get("name", {}).get("givenName") != user.given_name:
        return True
    if remote_user.get("name", {}).get("familyName") != user.family_name:
        return True
    if remote_user.get("displayName") != user.name:
        return True
    if remote_user.get("active") != user.suspended:
        return True
    if remote_user.get("emails", {}).get("value") != user.email:
        return True
    ssh_keys = sorted([base64.b64encode(ssh_key.ssh_value.encode()).decode() for ssh_key in user.ssh_keys])
    if sorted([c.value for c in remote_user.get("x509Certificates", [])]) != ssh_keys:
        return True
    return False


def _group_changed(group: Group, remote_group: dict, remote_scim_users: List[dict]):
    if remote_group.get("displayName") != group.global_urn:
        return True
    sram_members = sorted([member.user.external_id for member in group.collaboration_memberships if member.is_active])
    remote_users_by_id = {u["id"]: u for u in remote_scim_users}
    remote_members = []
    for remote_member in remote_scim_users:
        remote_user = remote_users_by_id.get(remote_member["value"])
        if remote_user:
            remote_members.append(remote_user["externalId"].replace(EXTERNAL_ID_POST_FIX, ""))
    if sram_members != sorted(remote_members):
        return True
    return False


def _all_remote_scim_objects(service: Service, scim_type, scim_resources=[], start_index=1, ):
    url = f"{service.scim_url}/{scim_type}?startIndex={start_index}"
    response = requests.get(url, headers=scim_headers(service), timeout=10)
    if not validate_response(response, service):
        return []
    scim_json = response.json()
    scim_resources = scim_resources + scim_json["Resources"]
    if scim_json["totalResults"] != len(scim_resources):
        # Preferably the SCIM server does not paginate, as this is not stateful and can lead to inconsistent results
        scim_resources = _all_remote_scim_objects(service, scim_type, scim_resources=scim_resources,
                                                  start_index=start_index + 1)
    return scim_resources


# Construct the members part of a group create / update
def _memberships(group: Union[Group, Collaboration], remote_users_by_external_id: dict):
    base_url = application_base_url()
    result = []
    active_members = [member for member in group.collaboration_memberships if member.is_active]
    for member in active_members:
        scim_object = remote_users_by_external_id[member.user.external_id]
        result.append(scim_member_object(base_url, member, scim_object))
    return result


def perform_sweep(service: Service):
    sync_results = {
        "users": {
            "deleted": [],
            "created": [],
            "updated": []
        },
        "groups": {
            "deleted": [],
            "created": [],
            "updated": []
        }
    }
    all_groups = all_scim_groups_by_service(service)
    all_users = all_scim_users_by_service(service)

    groups_by_identifier = {group.identifier: group for group in all_groups}
    users_by_external_id = {user.external_id: user for user in all_users}

    remote_scim_groups = _all_remote_scim_objects(service, SCIM_GROUPS)
    remote_scim_users = _all_remote_scim_objects(service, SCIM_USERS)

    # First delete all remote users and groups that are incorrectly in the remote SCIM database
    for remote_group in remote_scim_groups:
        if f"{remote_group['externalId'].replace(EXTERNAL_ID_POST_FIX, '')}" not in groups_by_identifier:
            url = f"{service.scim_url}{remote_group['meta']['location']}"
            response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=10)
            if validate_response(response, service):
                sync_results["users"]["deleted"].append(url)

    for remote_user in remote_scim_users:
        if f"{remote_user['externalId'].replace(EXTERNAL_ID_POST_FIX, '')}" not in users_by_external_id:
            url = f"{service.scim_url}{remote_user['meta']['location']}"
            response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=10)
            if validate_response(response, service):
                sync_results["groups"]["deleted"].append(url)

    remote_groups_by_external_id = {g["externalId"].replace(EXTERNAL_ID_POST_FIX, ""): g for g in remote_scim_groups}
    remote_users_by_external_id = {u["externalId"].replace(EXTERNAL_ID_POST_FIX, ""): u for u in remote_scim_users}

    # Now add all SRAM users and groups that are not present in the remote SCIM database
    for user in all_users:
        if user.external_id not in remote_users_by_external_id:
            scim_dict = create_user_template(user)
            url = f"{service.scim_url}/{SCIM_USERS}"
            response = requests.post(url, json=replace_none_values(scim_dict), headers=scim_headers(service),
                                     timeout=10)
            if validate_response(response, service):
                # Add the new remote user to the remote_users_by_external_id for membership lookup
                remote_users_by_external_id[user.external_id] = response.json()
                sync_results["users"][""]
        else:
            remote_user = remote_users_by_external_id[user.external_id]
            if _user_changed(user, replace_empty_string_values(remote_user)):
                scim_dict = update_user_template(user, remote_user["id"])
                url = f"{service.scim_url}{remote_user['meta']['location']}"
                requests.put(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)

    for group in all_groups:
        membership_scim_objects = _memberships(group, remote_users_by_external_id)
        if group.identifier not in remote_groups_by_external_id:
            scim_dict = create_group_template(group, membership_scim_objects)
            url = f"{service.scim_url}/{SCIM_GROUPS}"
            requests.post(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)
        else:
            remote_group = remote_groups_by_external_id[group.identifier]
            if _group_changed(group, replace_empty_string_values(remote_group), remote_scim_users):
                scim_dict = update_group_template(group, membership_scim_objects, remote_group["id"])
                url = f"{service.scim_url}{remote_group['meta']['location']}"
                requests.put(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)
