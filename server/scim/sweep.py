import base64
from typing import List, Union

import requests
from werkzeug.exceptions import BadRequest

from server.api.base import application_base_url
from server.db.domain import Service, Group, User, Collaboration
from server.scim import EXTERNAL_ID_POST_FIX, SCIM_GROUPS, SCIM_USERS
from server.scim.group_template import create_group_template, update_group_template, scim_member_object
from server.scim.repo import all_scim_groups_by_service, all_scim_users_by_service
from server.scim.scim import scim_headers, validate_response
from server.scim.user_template import create_user_template, replace_none_values, update_user_template, \
    inactive_days

CONNECTION_TIMEOUT = 3.05  # seconds
READ_TIMEOUT = 10  # seconds
TIMEOUT = (CONNECTION_TIMEOUT, READ_TIMEOUT)


def _replace_empty_string_values(d: dict):
    for k, v in d.items():
        if isinstance(v, dict):
            _replace_empty_string_values(v)
        elif v == "":
            d[k] = None
    return d


def _compare_with_none_equals_empty(attr_remote, attr_sram):
    if isinstance(attr_sram, str) and not len(attr_sram.strip()):
        attr_sram = None
    return attr_sram != attr_remote


def _user_changed(user: User, remote_user: dict):
    from server.scim.schema_template import get_scim_schema_sram_user

    remote_user = _replace_empty_string_values(remote_user)
    if _compare_with_none_equals_empty(remote_user.get("userName"), user.username):
        return True
    if _compare_with_none_equals_empty(remote_user.get("name", {}).get("givenName"), user.given_name):
        return True
    if _compare_with_none_equals_empty(remote_user.get("name", {}).get("familyName"), user.family_name):
        return True
    if _compare_with_none_equals_empty(remote_user.get("displayName"), user.name):
        return True
    if remote_user.get("active") is user.suspended:
        return True
    if _compare_with_none_equals_empty(remote_user.get("emails", [{"value": None}])[0].get("value"), user.email):
        return True
    ssh_keys = sorted([base64.b64encode(ssh_key.ssh_value.encode()).decode() for ssh_key in user.ssh_keys])
    remote_ssh_keys = sorted([c.get("value") for c in remote_user.get("x509Certificates", [])])
    if remote_ssh_keys != ssh_keys:
        return True
    if get_scim_schema_sram_user() in remote_user:
        edu_person_scoped_affiliation = remote_user[get_scim_schema_sram_user()].get("eduPersonScopedAffiliation")
        if _compare_with_none_equals_empty(edu_person_scoped_affiliation, user.affiliation):
            return True
        if _compare_with_none_equals_empty(remote_user[get_scim_schema_sram_user()].get("eduPersonUniqueId"), user.uid):
            return True
        vo_person_external_affiliation = remote_user[get_scim_schema_sram_user()].get("voPersonExternalAffiliation")
        if _compare_with_none_equals_empty(vo_person_external_affiliation, user.scoped_affiliation):
            return True
        vo_person_external_id = remote_user[get_scim_schema_sram_user()].get("voPersonExternalId")
        if _compare_with_none_equals_empty(vo_person_external_id, user.eduperson_principal_name):
            return True
        sramInactiveDays = remote_user[get_scim_schema_sram_user()].get("sramInactiveDays")
        if _compare_with_none_equals_empty(sramInactiveDays, inactive_days(user.last_login_date)):
            return True
    return False


def _group_changed(group: Union[Group, Collaboration], remote_group: dict, remote_scim_users: List[dict]):
    from server.scim.schema_template import get_scim_schema_sram_group

    def link_is_different(name: str, value: str):
        for link in remote_group[get_scim_schema_sram_group()].get("links", []):
            if link.get('name', '') != name:
                continue
            if link.get('value', '') != value:
                return True
            return False
        return True

    remote_group = _replace_empty_string_values(remote_group)
    if _compare_with_none_equals_empty(remote_group.get("displayName"), group.name):
        return True
    sram_members = sorted([member.user.external_id for member in group.collaboration_memberships if member.is_active()])
    remote_users_by_id = {u["id"]: u for u in remote_scim_users}
    remote_members = []
    for remote_member in remote_group.get("members", []):
        remote_user = remote_users_by_id.get(remote_member["value"])
        if remote_user:
            remote_members.append(remote_user["externalId"].replace(EXTERNAL_ID_POST_FIX, ""))
    if sram_members != sorted(remote_members):
        return True
    if get_scim_schema_sram_group() in remote_group:
        if _compare_with_none_equals_empty(remote_group[get_scim_schema_sram_group()].get("description"), group.description):
            return True
        if _compare_with_none_equals_empty(remote_group[get_scim_schema_sram_group()].get("urn"), group.global_urn):
            return True

        if isinstance(group, Collaboration):
            if link_is_different('sbs_url', f"{application_base_url()}/collaborations/{group.identifier}"):
                return True
            if link_is_different('logo', group.logo):
                return True
        elif remote_group[get_scim_schema_sram_group()].get("links", []) != []:
            return True

        labels = [t.tag_value for t in group.tags] if hasattr(group, "tags") else []
        if sorted(remote_group[get_scim_schema_sram_group()].get("labels", [])) != sorted(labels):
            return True
    return False


def _all_remote_scim_objects(service: Service, scim_type):
    scim_resources = []
    while True:
        url = f"{service.scim_url}/{scim_type}?startIndex={len(scim_resources) + 1}"
        response = requests.get(url, headers=scim_headers(service), timeout=TIMEOUT)
        if not validate_response(response, service, outside_user_context=True, extra_logging=f"SCIM {scim_type} list"):
            raise BadRequest(f"Invalid response from remote SCIM server (got HTTP status {response.status_code})")

        scim_json = response.json()
        scim_resources += scim_json["Resources"]

        if scim_json["totalResults"] == len(scim_resources):
            break

    return scim_resources


# Construct the members part of a group create / update
def _memberships(group: Union[Group, Collaboration], remote_users_by_external_id: dict):
    base_url = application_base_url()
    result = []
    active_members = [member for member in group.collaboration_memberships if member.is_active()]
    for member in active_members:
        scim_object = remote_users_by_external_id.get(member.user.external_id)
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
        },
        "scim_url": service.scim_url
    }
    all_groups = all_scim_groups_by_service(service)
    all_users = all_scim_users_by_service(service)

    groups_by_identifier = {group.identifier: group for group in all_groups}
    users_by_external_id = {user.external_id: user for user in all_users}
    try:
        remote_scim_groups = _all_remote_scim_objects(service, SCIM_GROUPS)
        remote_scim_users = _all_remote_scim_objects(service, SCIM_USERS)
    except BadRequest as e:
        # We abort, see https://github.com/SURFscz/SBS/issues/601 and reraise the exception
        raise e

    # First delete all remote users and groups that are incorrectly in the remote SCIM database
    for remote_group in remote_scim_groups:
        if f"{remote_group.get('externalId', '').replace(EXTERNAL_ID_POST_FIX, '')}" not in groups_by_identifier:
            if "meta" in remote_group and "location" in remote_group['meta']:
                url = f"{service.scim_url}{remote_group['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=TIMEOUT)
                if validate_response(response, service, outside_user_context=True, extra_logging="SCIM group delete"):
                    sync_results["groups"]["deleted"].append(url)

    for remote_user in remote_scim_users:
        if f"{remote_user.get('externalId', '').replace(EXTERNAL_ID_POST_FIX, '')}" not in users_by_external_id:
            if "meta" in remote_user and "location" in remote_user['meta']:
                url = f"{service.scim_url}{remote_user['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=TIMEOUT)
                if validate_response(response, service, outside_user_context=True, extra_logging="SCIM user delete"):
                    sync_results["users"]["deleted"].append(url)

    remote_groups_by_external_id = {g.get("externalId", "").replace(EXTERNAL_ID_POST_FIX, ""): g for g in
                                    remote_scim_groups}
    remote_users_by_external_id = {u.get("externalId", "").replace(EXTERNAL_ID_POST_FIX, ""): u for u in
                                   remote_scim_users}

    for user in all_users:
        # Add all SRAM users that are not present in the remote SCIM database
        if user.external_id not in remote_users_by_external_id:
            scim_dict = create_user_template(user)
            url = f"{service.scim_url}/{SCIM_USERS}"
            scim_dict_cleansed = replace_none_values(scim_dict)
            response = requests.post(url, json=scim_dict_cleansed, headers=scim_headers(service), timeout=TIMEOUT)
            if validate_response(response, service, outside_user_context=True, extra_logging="SCIM user create"):
                # Add the new remote user to the remote_users_by_external_id for membership lookup
                response_json = response.json()
                remote_users_by_external_id[user.external_id] = response_json
                sync_results["users"]["created"].append(response_json)
        else:
            remote_user = remote_users_by_external_id.get(user.external_id)
            # Update SRAM users that are not equal to their counterpart in the remote SCIM database
            if _user_changed(user, remote_user):
                scim_dict = update_user_template(user, remote_user["id"])
                if "meta" in remote_user and "location" in remote_user['meta']:
                    url = f"{service.scim_url}{remote_user['meta']['location']}"
                    scim_dict_cleansed = replace_none_values(scim_dict)
                    response = requests.put(url, json=scim_dict_cleansed, headers=scim_headers(service), timeout=TIMEOUT)
                    if validate_response(response, service, outside_user_context=True,
                                         extra_logging="SCIM user update"):
                        response_json = response.json()
                        sync_results["users"]["updated"].append(response_json)

    for group in all_groups:
        membership_scim_objects = _memberships(group, remote_users_by_external_id)
        if not membership_scim_objects and service.sweep_remove_orphans:
            remote_group = remote_groups_by_external_id.get(group.identifier)
            if remote_group and "meta" in remote_group and "location" in remote_group["meta"]:
                url = f"{service.scim_url}{remote_group['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=TIMEOUT)
                if validate_response(response, service, outside_user_context=True, extra_logging="SCIM group delete"):
                    sync_results["groups"]["deleted"].append(url)
        elif group.identifier not in remote_groups_by_external_id:
            scim_dict = create_group_template(group, membership_scim_objects)
            url = f"{service.scim_url}/{SCIM_GROUPS}"
            scim_dict_cleansed = replace_none_values(scim_dict)
            response = requests.post(url, json=scim_dict_cleansed, headers=scim_headers(service), timeout=TIMEOUT)
            if validate_response(response, service, outside_user_context=True, extra_logging="SCIM group create"):
                response_json = response.json()
                sync_results["groups"]["created"].append(response_json)
        else:
            remote_group = remote_groups_by_external_id[group.identifier]
            if _group_changed(group, remote_group, remote_scim_users):
                scim_dict = update_group_template(group, membership_scim_objects, remote_group["id"])
                if remote_group and "meta" in remote_group and "location" in remote_group["meta"]:
                    url = f"{service.scim_url}{remote_group['meta']['location']}"
                    scim_dict_cleansed = replace_none_values(scim_dict)
                    response = requests.put(url, json=scim_dict_cleansed, headers=scim_headers(service), timeout=TIMEOUT)
                    if validate_response(response, service, outside_user_context=True,
                                         extra_logging="SCIM group update"):
                        response_json = response.json()
                        sync_results["groups"]["updated"].append(response_json)

    return sync_results
