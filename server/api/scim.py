# -*- coding: future_fstrings -*-
from typing import List, Union

from flasgger import swag_from
from flask import Blueprint, Response

from server.api.base import json_endpoint
from server.auth.tokens import validate_service_token
from server.db.domain import User, CollaborationMembership, Service, Collaboration, Organisation, Group
from server.db.models import flatten
from server.scim.schema_template import SCHEMA_CORE, schemas_template, schema_user_template, schema_group_template
from server.scim.group_template import find_groups_template, find_group_by_id_template
from server.scim.user_template import find_users_template, external_id_post_fix, find_user_by_id_template, version_value

scim_api = Blueprint("scim_api", __name__, url_prefix="/api/scim/v2")


def _add_etag_header(scim_object: Union[User, Group, Collaboration]):
    def response_header(response: Response):
        response.headers.set("Etag", version_value(scim_object))
        return 200

    return response_header


def _unique_scim_objects(objects: List[Union[User, Collaboration]]):
    seen = set()
    return [obj for obj in objects if obj.id not in seen and not seen.add(obj.id)]


@scim_api.route(f"/Schemas/{SCHEMA_CORE}:User", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_user():
    return schema_user_template(), 200


@scim_api.route(f"/Schemas/{SCHEMA_CORE}:Group", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_group():
    return schema_group_template(), 200


@scim_api.route("/Schemas", methods=["GET"], strict_slashes=False)
@json_endpoint
def schemas():
    return schemas_template(), 200


@scim_api.route("/Users", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_users.yml")
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
@swag_from("../swagger/public/paths/get_user_by_external_id.yml")
@json_endpoint
def service_user_by_external_id(user_external_id: str):
    validate_service_token("scim_enabled")
    stripped_external_id = user_external_id.replace(external_id_post_fix, "")
    user = User.query.filter(User.external_id == stripped_external_id).one()
    return find_user_by_id_template(user), _add_etag_header(user)


@scim_api.route("/Groups", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_groups.yml")
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
    return find_groups_template(collaborations + all_groups), 200


@scim_api.route("/Groups/<group_external_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_group_by_external_id.yml")
@json_endpoint
def service_group_by_identifier(group_external_id: str):
    validate_service_token("scim_enabled")
    stripped_group_identifier = group_external_id.replace(external_id_post_fix, "")
    group = Collaboration.query.filter(Collaboration.identifier == stripped_group_identifier).first()
    if not group:
        group = Group.query.filter(Group.identifier == stripped_group_identifier).one()
    return find_group_by_id_template(group), _add_etag_header(group)
