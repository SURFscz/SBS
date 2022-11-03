# -*- coding: future_fstrings -*-
import urllib.parse
from typing import Union

import requests

from server.db.domain import Service, User, Group, Collaboration
from server.logger.context_logger import ctx_logger
from server.scim.user_template import create_user_template, update_user_template

SCIM_USERS = "Users"
SCIM_GROUPS = "Groups"


def _unique_scim_services(services):
    seen = set()
    return [service for service in services if
            service.id not in seen and not seen.add(service.id) and service.provision_scim_users()]


def _provision_user(scim_object, service, user):
    scim_dict = update_user_template(user, scim_object["id"]) if scim_object else create_user_template(user)
    request_method = requests.put if scim_object else requests.post
    return request_method(f"{service.scim_url}/{scim_object['meta']['location']}",
                          json=scim_dict,
                          headers={"Bearer": service.scim_bearer_token,
                                   "Accept": "application/json, application/json;charset=UTF-8"})


def _membership_user_scim_identifiers(service: Service, group: Union[Group, Collaboration]):
    logger = ctx_logger("scim")
    members = [member for member in group.collaboration_memberships if member.is_active]
    result = []
    for member in members:
        user = member.user
        scim_object = lookup_scim_object(service, SCIM_USERS, user.external_id)
        if not scim_object:
            # We need to provision this user first
            response = _provision_user(scim_object, service, user)
            if response.status_code != 200:
                logger.error(f"Scim endpoint {service.scim_url} returned an error: {response.json()}")
                scim_object = None
            else:
                scim_object = response.json()
        result.append(scim_object["id"])
    return result


def lookup_scim_object(service: Service, scim_type: str, external_id: str):
    logger = ctx_logger("scim")

    if not service.scim_enabled or not service.scim_url:
        return None
    query_filter = f"filter=externalId eq \"{external_id}\""
    response = requests.get(f"{service.scim_url}/{scim_type}?{urllib.parse.quote(query_filter)}",
                            headers={"Bearer": service.scim_bearer_token,
                                     "Accept": "application/json, application/json;charset=UTF-8"})
    scim_json = response.json()
    if response.status_code != 200:
        logger.error(f"Scim endpoint {service.scim_url} returned an error: {scim_json}")
        return None

    return None if scim_json["totalResults"] == 0 else scim_json["Resources"][0]


def apply_user_change(user: User, deletion=False):
    logger = ctx_logger("scim")
    # We need all services that are accessible for this user
    collaborations = [member.collaboration for member in user.collaboration_memberships if member.is_active]
    organisations = [co.organisation for co in collaborations]
    services = _unique_scim_services([co.services for co in collaborations] + [org.services for org in organisations])
    for service in services:
        scim_object = lookup_scim_object(service, SCIM_USERS, user.external_id)
        if deletion and scim_object:
            response = requests.delete(f"{service.scim_url}/{scim_object['meta']['location']}",
                                       headers={"Bearer": service.scim_bearer_token})
        else:
            response = _provision_user(scim_object, service, user)
        if response.status_code > 204:
            is_json = "application/json" in response.headers.get("Content-Type", "").lower()
            scim_json = response.json() if is_json else {}
            logger.error(f"Scim endpoint {service.scim_url} returned an error: {scim_json}")


def apply_group_change(group: Group, deletion=False):
    logger = ctx_logger("scim")
    services = _unique_scim_services(group.collaboration.services + group.collaboration.organisation.services)
