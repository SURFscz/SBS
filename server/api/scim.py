# -*- coding: future_fstrings -*-
from typing import List, Union

from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.tokens import validate_service_token
from server.db.domain import User, CollaborationMembership, Service, Collaboration, Organisation, Group
from server.db.models import flatten
from server.scim.group_template import find_groups_template
from server.scim.user_template import find_users_template, external_id_post_fix

scim_api = Blueprint("scim_api", __name__, url_prefix="/api/scim")


def _unique_scim_objects(objects: List[Union[User, Collaboration]]):
    seen = set()
    return [obj for obj in objects if obj.id not in seen and not seen.add(obj.id)]


@scim_api.route("/Users", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_users():
    service = validate_service_token("scim_enabled")
    users_from_collaborations = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    users_from_organisations = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.organisation) \
        .join(Organisation.services) \
        .filter(Service.id == service.id) \
        .all()

    users = _unique_scim_objects(users_from_collaborations + users_from_organisations)
    return find_users_template(users), 200


@scim_api.route("/Users/<user_external_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_user_by_external_id(user_external_id: str):
    validate_service_token("scim_enabled")
    stripped_external_id = user_external_id.replace(external_id_post_fix, "")
    users = User.query.filter(User.external_id == stripped_external_id).all()
    return find_users_template(users), 200


@scim_api.route("/Groups", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_groups():
    service = validate_service_token("scim_enabled")
    service_collaborations = Collaboration.query \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    service_organisation_collaborations = Collaboration.query \
        .join(Collaboration.organisation) \
        .join(Organisation.services) \
        .filter(Service.id == service.id) \
        .all()
    collaborations = _unique_scim_objects(service_collaborations + service_organisation_collaborations)
    all_groups = flatten(co.groups for co in collaborations)
    return find_groups_template(service, collaborations + all_groups), 200


@scim_api.route("/Groups/<group_identifier>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_group_by_identifier(group_identifier: str):
    service = validate_service_token("scim_enabled")
    stripped_group_identifier = group_identifier.replace(external_id_post_fix, "")
    groups = Collaboration.query.filter(Collaboration.identifier == stripped_group_identifier).all()
    if not groups:
        groups = Group.query.filter(Group.identifier == stripped_group_identifier).all()
    return find_groups_template(service, groups), 200
