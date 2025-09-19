import logging
import urllib.parse
import requests

from functools import wraps
from typing import Union, List

from server.api.base import application_base_url
from server.auth.tokens import decrypt_scim_bearer_token
from server.db.db import db
from server.db.domain import Service, User, Group, Collaboration, Organisation
from server.db.models import flatten, unique_model_objects
from server.logger.context_logger import ctx_logger
from server.scim import EXTERNAL_ID_POST_FIX, SCIM_USERS, SCIM_GROUPS
from server.scim.group_template import update_group_template, create_group_template, scim_member_object
from server.scim.user_template import create_user_template, update_user_template, replace_none_values


def apply_change(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            f(*args, **kwargs)
        except Exception as e:
            logger = logging.getLogger("scim")
            logger.error(f"Error (absorbed) during SCIM exchange ({str(e)})")
        finally:
            db.session.rollback()
            db.session.close()

    return wrapper


def _log_scim_error(response, service, outside_user_context, extra_logging):
    logger = ctx_logger("scim") if not outside_user_context else logging.getLogger("scim")
    is_json = response and "json" in response.headers.get("Content-Type", "").lower()
    scim_json = response.json() if is_json else {}

    extra_log_msg = ""
    if extra_logging:
        extra_log_msg = f" ({extra_logging})"
    logger.error(f"Scim endpoint {service.scim_url}{extra_log_msg} returned error {response.status_code}: {scim_json}")


def validate_response(response, service, outside_user_context=False, extra_logging=None):
    if not response or response.status_code > 204:
        _log_scim_error(response, service, outside_user_context, extra_logging)
        return False
    return True


# Get the headers with the bearer authentication
def scim_headers(service: Service, is_delete=False):
    plain_bearer_token = decrypt_scim_bearer_token(service)
    headers = {"Authorization": f"Bearer {plain_bearer_token}",
               "X-Service": str(service.id)}
    if not is_delete:
        headers["Accept"] = "application/scim+json"
        headers["Content-Type"] = "application/scim+json"
    return headers


# Remove duplicates from services
def _unique_scim_services(services: List[Service]):
    return [s for s in unique_model_objects(services) if s.scim_enabled]


# Is the user connected - through memberships excluding collaboration_to_exclude - to the service
def _has_user_service_access(user: User, service: Service, collaboration_to_exclude: Collaboration):
    collaborations = [member.collaboration for member in user.collaboration_memberships if
                      member.collaboration.identifier != collaboration_to_exclude.identifier and member.is_active()]
    collaboration_services = flatten([coll.services for coll in collaborations])
    services = _unique_scim_services(collaboration_services)
    return service in services


# If the user is known in the remote SCIM then update the user else provision the user in the remote SCIM
def _provision_user(scim_object, service: Service, user: User):
    scim_dict = update_user_template(user, scim_object["id"]) if scim_object else create_user_template(user)
    request_method = requests.put if scim_object else requests.post
    postfix = scim_object['meta']['location'] if scim_object else "/Users"
    url = f"{service.scim_url}{postfix}"
    return request_method(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)


# If the group / collaboration is known in the remote SCIM then update the group else provision the group
def _provision_group(scim_object, service: Service, group: Union[Group, Collaboration]):
    membership_scim_objects = membership_user_scim_objects(service, group)
    if scim_object:
        scim_dict = update_group_template(group, membership_scim_objects, scim_object["id"])
    else:
        scim_dict = create_group_template(group, membership_scim_objects)
    request_method = requests.put if scim_object else requests.post
    postfix = scim_object['meta']['location'] if scim_object else "/Groups"
    url = f"{service.scim_url}{postfix}"
    return request_method(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)


# Get all SCIM members of the group / collaboration and provision new ones
def membership_user_scim_objects(service: Service, group: Union[Group, Collaboration]):
    base_url = application_base_url()

    members = [member for member in group.collaboration_memberships if member.is_active()]
    result = []
    for member in members:
        user = member.user
        scim_object = _lookup_scim_object(service, SCIM_USERS, user.external_id)
        if not scim_object:
            # We need to provision this user first as it is unknown in the remote SCIM DB
            response = _provision_user(scim_object, service, user)
            if validate_response(response, service, extra_logging=f"membership {user.username} of"
                                                                  f" {group.global_urn}"):
                scim_object = response.json()
        if scim_object:
            result.append(scim_member_object(base_url, member, scim_object))
    return result


# Do a lookup of the user or group in the external SCIM DB belonging to this service
def _lookup_scim_object(service: Service, scim_type: str, external_id: str):
    query_filter = f"externalId eq \"{external_id}{EXTERNAL_ID_POST_FIX}\""
    url = f"{service.scim_url}/{scim_type}?filter={urllib.parse.quote(query_filter)}"
    response = requests.get(url, headers=scim_headers(service), timeout=10)
    if not validate_response(response, service, extra_logging=f"lookup {scim_type} {external_id}"):
        return None
    scim_json = response.json()
    return None if scim_json["totalResults"] == 0 else scim_json["Resources"][0]


def _do_apply_user_change(user: User, service: Union[None, Service], deletion: bool):
    if service:
        scim_services = [service]
    else:
        # We need all services that are accessible for this user
        collaborations = [member.collaboration for member in user.collaboration_memberships if member.is_active()]
        scim_services = _all_unique_scim_services_of_collaborations(collaborations)
    for service in scim_services:
        response = None
        scim_object = _lookup_scim_object(service, SCIM_USERS, user.external_id)
        # No use to delete the user if the user is unknown in the remote system
        if deletion:
            if scim_object:
                url = f"{service.scim_url}{scim_object['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=10)
        else:
            response = _provision_user(scim_object, service, user)
        if response:
            validate_response(response, service, extra_logging=f"user={user.username}, delete={deletion}")


def _all_unique_scim_services_of_collaborations(collaborations):
    organisations = [co.organisation for co in collaborations]
    all_services = flatten([co.services for co in collaborations]) + flatten([org.services for org in organisations])
    scim_services = _unique_scim_services(all_services)
    return scim_services


def _do_apply_group_collaboration_change(group: Union[Group, Collaboration], services: List[Service], deletion: bool):
    scim_services = _unique_scim_services(services)
    response = None
    for service in scim_services:
        scim_object = _lookup_scim_object(service, SCIM_GROUPS, group.identifier)
        if deletion:
            # No use to delete the group if the group is unknown in the remote system
            if scim_object:
                url = f"{service.scim_url}{scim_object['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=10)
                if isinstance(group, Collaboration):
                    for co_group in group.groups:
                        _do_apply_group_collaboration_change(co_group, services=scim_services, deletion=True)
                    for user in [member.user for member in group.collaboration_memberships]:
                        if not _has_user_service_access(user, service, group):
                            _do_apply_user_change(user, service=service, deletion=True)
        else:
            response = _provision_group(scim_object, service, group)
        if response:
            validate_response(response, service, extra_logging=f"group={group.global_urn} delete={deletion}")


# User has been updated. Propagate the changes to the remote SCIM DB to all connected SCIM services
@apply_change
def apply_user_change(app, user_id):
    with app.app_context():
        user = User.query.filter(User.id == user_id).one()
        _do_apply_user_change(user, service=None, deletion=False)


# User has been deleted. Propagate the changes to the remote SCIM DB to all connected SCIM services
@apply_change
def apply_user_deletion(app, external_id, collaboration_identifiers: List[int]):
    with app.app_context():
        collaborations = Collaboration.query.filter(Collaboration.id.in_(collaboration_identifiers)).all()
        scim_services = _all_unique_scim_services_of_collaborations(collaborations)
        for service in scim_services:
            scim_object = _lookup_scim_object(service, SCIM_USERS, external_id)
            # No use to delete the user if the user is unknown in the remote system
            if scim_object:
                url = f"{service.scim_url}{scim_object['meta']['location']}"
                response = requests.delete(url, headers=scim_headers(service, is_delete=True), timeout=10)
                validate_response(response, service, extra_logging=f"user={external_id}, delete=True")
        for co in collaborations:
            services = _all_unique_scim_services_of_collaborations([co])
            _do_apply_group_collaboration_change(co, services, deletion=False)
            for group in co.groups:
                _do_apply_group_collaboration_change(group, services, deletion=False)


# Collaboration has been created, updated or deleted. Propagate the changes to the remote SCIM DB's
@apply_change
def apply_collaboration_change(app, collaboration_id: int, deletion):
    with app.app_context():
        collaboration = Collaboration.query.filter(Collaboration.id == collaboration_id).one()
        services = collaboration.services
        for group in collaboration.groups:
            _do_apply_group_collaboration_change(group, services, deletion)
        _do_apply_group_collaboration_change(collaboration, services, deletion)


# Group has been created, updated or deleted. Propagate the changes to the remote SCIM DB's
@apply_change
def apply_group_change(app, group_id: int, deletion):
    with app.app_context():
        group = Group.query.filter(Group.id == group_id).one()
        services = group.collaboration.services
        _do_apply_group_collaboration_change(group, services, deletion)


# Service has been added to collaboration or removed from collaboration
@apply_change
def apply_service_changed(app, collaboration_id, service_id, deletion):
    with app.app_context():
        collaboration = Collaboration.query.filter(Collaboration.id == collaboration_id).one()
        services = [Service.query.filter(Service.id == service_id).one()]
        for group in collaboration.groups:
            _do_apply_group_collaboration_change(group, services, deletion)
        _do_apply_group_collaboration_change(collaboration, services, deletion)


# Organisation has been deleted
@apply_change
def apply_organisation_change(app, organisation_id: int, deletion):
    with app.app_context():
        organisation = Organisation.query.filter(Organisation.id == organisation_id).one()
        for co in organisation.collaborations:
            services = co.services
            for group in co.groups:
                _do_apply_group_collaboration_change(group, services, deletion)
            _do_apply_group_collaboration_change(co, services, deletion)
