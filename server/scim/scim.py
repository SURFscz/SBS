# -*- coding: future_fstrings -*-
import urllib.parse
from typing import Union, List

import requests

from server.db.domain import Service, User, Group, Collaboration, Organisation
from server.db.models import flatten
from server.logger.context_logger import ctx_logger
from server.scim.counter import atomic_increment_counter_value
from server.scim.group_template import update_group_template, create_group_template
from server.scim.user_template import create_user_template, update_user_template

SCIM_USERS = "Users"
SCIM_GROUPS = "Groups"


# Get the headers with the bearer authentication
def _headers(service: Service, is_delete=False):
    headers = {"Authorization": f"Bearer {service.scim_bearer_token}",
               "X-Service": str(service.id)}
    if not is_delete:
        headers["Accept"] = "application/json, application/json;charset=UTF-8"
    return headers


# Construct counter query parma
def _counter_query_param(service: Service):
    return f"?counter={atomic_increment_counter_value(service)}"


# Remove duplicates from services
def _unique_scim_services(services: List[Service], provision_enabled_method):
    seen = set()
    return [service for service in services if
            service.id not in seen and not seen.add(service.id) and getattr(service, provision_enabled_method)()]


# Is the user connected - through memberships excluding collaboration_to_exclude - to the service
def _has_user_service_access(user: User, service: Service, collaboration_to_exclude: Collaboration):
    collaborations = [member.collaboration for member in user.collaboration_memberships if
                      member.collaboration.identifier != collaboration_to_exclude.identifier and member.is_active()]
    collaboration_services = flatten([coll.services for coll in collaborations])
    organisation_services = flatten([coll.organisation.services for coll in collaborations])
    services = _unique_scim_services(collaboration_services + organisation_services, "provision_scim_users")
    return service in services


# If the user is known in the remote SCIM then update the user else provision the user in the remote SCIM
def _provision_user(scim_object, service: Service, user: User):
    scim_dict = update_user_template(user, scim_object["id"]) if scim_object else create_user_template(user)
    request_method = requests.put if scim_object else requests.post
    postfix = scim_object['meta']['location'] if scim_object else "/Users"
    url = f"{service.scim_url}{postfix}{_counter_query_param(service)}"
    return request_method(url, json=scim_dict, headers=_headers(service))


# If the group / collaboration is known in the remote SCIM then update the group else provision the group
def _provision_group(scim_object, service: Service, group: Union[Group, Collaboration]):
    membership_identifiers = membership_user_scim_identifiers(service, group)
    if scim_object:
        scim_dict = update_group_template(group, membership_identifiers, scim_object["id"])
    else:
        scim_dict = create_group_template(group, membership_identifiers)
    request_method = requests.put if scim_object else requests.post
    postfix = scim_object['meta']['location'] if scim_object else "/Groups"
    url = f"{service.scim_url}{postfix}{_counter_query_param(service)}"
    return request_method(url, json=scim_dict, headers=_headers(service))


# Get all external identifiers of the members of the group / collaboration and provision new ones
def membership_user_scim_identifiers(service: Service, group: Union[Group, Collaboration]):
    if not service.provision_scim_users():
        return []

    members = [member for member in group.collaboration_memberships if member.is_active]
    result = []
    for member in members:
        user = member.user
        scim_object = _lookup_scim_object(service, SCIM_USERS, user.external_id)
        if not scim_object:
            # We need to provision this user first as it is unknown in the remote SCIM DB
            response = _provision_user(scim_object, service, user)
            if response.status_code > 204:
                _log_scim_error(response, service)
            else:
                scim_object = response.json()
        if scim_object:
            result.append(scim_object["id"])
    return result


def _log_scim_error(response, service):
    logger = ctx_logger("scim")
    is_json = "json" in response.headers.get("Content-Type", "").lower()
    scim_json = response.json() if is_json else {}
    logger.error(f"Scim endpoint {service.scim_url} returned an error: {scim_json}")


# Do a lookup of the user or group in the external SCIM DB belonging to this service
def _lookup_scim_object(service: Service, scim_type: str, external_id: str):
    query_filter = f"externalId eq \"{external_id}\""
    url = f"{service.scim_url}/{scim_type}?filter={urllib.parse.quote(query_filter)}"
    response = requests.get(url, headers=_headers(service))
    if response.status_code > 204:
        _log_scim_error(response, service)
        return None
    scim_json = response.json()
    return None if scim_json["totalResults"] == 0 else scim_json["Resources"][0]


# User has been created, updated or deleted. Propagate the changes to the remote SCIM DB to all connected SCIM services
def apply_user_change(user: User, deletion=False):
    # We need all services that are accessible for this user
    collaborations = [member.collaboration for member in user.collaboration_memberships if member.is_active]
    organisations = [co.organisation for co in collaborations]
    all_services = flatten([co.services for co in collaborations]) + flatten([org.services for org in organisations])
    scim_services = _unique_scim_services(all_services, "provision_scim_users")
    for service in scim_services:
        scim_object = _lookup_scim_object(service, SCIM_USERS, user.external_id)
        # No use to delete the user if the user is unknown in the remote system
        if deletion and scim_object:
            url = f"{service.scim_url}{scim_object['meta']['location']}{_counter_query_param(service)}"
            response = requests.delete(url, headers=_headers(service, is_delete=True))
        else:
            response = _provision_user(scim_object, service, user)
        if response.status_code > 204:
            _log_scim_error(response, service)
    return bool(scim_services)


# Group or collaboration has been created, updated or deleted. Propagate the changes to the remote SCIM DB's
def apply_group_change(group: Union[Group, Collaboration], deletion=False):
    if isinstance(group, Group):
        services = group.collaboration.services + group.collaboration.organisation.services
    else:
        services = group.services + group.organisation.services
    scim_services = _unique_scim_services(services, "provision_scim_groups")
    for service in scim_services:
        scim_object = _lookup_scim_object(service, SCIM_GROUPS, group.identifier)
        # No use to delete the group if the group is unknown in the remote system
        if deletion and scim_object:
            url = f"{service.scim_url}{scim_object['meta']['location']}{_counter_query_param(service)}"
            response = requests.delete(url, headers=_headers(service, is_delete=True))
            if isinstance(group, Collaboration):
                for user in [member.user for member in group.collaboration_memberships]:
                    if not _has_user_service_access(user, service, group):
                        apply_user_change(user, True)
        else:
            response = _provision_group(scim_object, service, group)
        if response.status_code > 204:
            _log_scim_error(response, service)
    return bool(scim_services)


# Organisation has a new service or a service is deleted from an organisation
def apply_organisation_change(organisation: Organisation, deletion=False):
    results = [apply_group_change(collaboration, deletion=deletion) for collaboration in organisation.collaborations]
    return any(results)
