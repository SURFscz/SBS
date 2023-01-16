from typing import Union

from flasgger import swag_from
from flask import Blueprint, Response
from werkzeug.exceptions import Unauthorized

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_write_access
from server.auth.tokens import validate_service_token
from server.db.domain import User, Collaboration, Group, Service
from server.scim import SCIM_URL_PREFIX, EXTERNAL_ID_POST_FIX
from server.scim.group_template import find_groups_template, find_group_by_id_template
from server.scim.repo import all_scim_users_by_service, all_scim_groups_by_service
from server.scim.schema_template import schemas_template, \
    schema_core_user_template, schema_core_group_template, \
    schema_sram_user_template, schema_sram_group_template, \
    SCIM_SCHEMA_CORE_USER, SCIM_SCHEMA_CORE_GROUP, \
    SCIM_SCHEMA_SRAM_USER, SCIM_SCHEMA_SRAM_GROUP
from server.scim.resource_type_template import resource_type_template, resource_type_user_template, resource_type_group_template
from server.scim.sweep import perform_sweep
from server.scim.user_template import find_users_template, find_user_by_id_template, version_value

scim_api = Blueprint("scim_api", __name__, url_prefix=SCIM_URL_PREFIX)


def _add_etag_header(scim_object: Union[User, Group, Collaboration]):
    def response_header(response: Response):
        response.headers.set("Etag", version_value(scim_object))
        return 200

    return response_header


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_CORE_USER}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_user():
    return schema_core_user_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_CORE_GROUP}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_group():
    return schema_core_group_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_SRAM_USER}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_group():
    return schema_sram_user_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_SRAM_GROUP}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_group():
    return schema_sram_group_template(), 200


@scim_api.route("/Schemas", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_schemas.yml")
@json_endpoint
def schemas():
    return schemas_template(), 200


@scim_api.route("/ResourceTypes/User", methods=["GET"], strict_slashes=False)
@json_endpoint
def resource_types_user():
    return resource_type_user_template(), 200


@scim_api.route("/ResourceTypes/Group", methods=["GET"], strict_slashes=False)
@json_endpoint
def resource_types_group():
    return resource_type_group_template(), 200


@scim_api.route("/ResourceTypes", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_resource_types.yml")
@json_endpoint
def resource_types():
    return resource_type_template(), 200


@scim_api.route("/Users", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_users.yml")
@json_endpoint
def service_users():
    service = validate_service_token("scim_enabled")
    users = all_scim_users_by_service(service)
    return find_users_template(users), 200


@scim_api.route("/Users/<user_external_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_user_by_external_id.yml")
@json_endpoint
def service_user_by_external_id(user_external_id: str):
    validate_service_token("scim_enabled")
    stripped_external_id = user_external_id.replace(EXTERNAL_ID_POST_FIX, "")
    user = User.query.filter(User.external_id == stripped_external_id).one()
    return find_user_by_id_template(user), _add_etag_header(user)


@scim_api.route("/Groups", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_groups.yml")
@json_endpoint
def service_groups():
    service = validate_service_token("scim_enabled")
    all_scim_groups = all_scim_groups_by_service(service)
    return find_groups_template(all_scim_groups), 200


@scim_api.route("/Groups/<group_external_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_group_by_external_id.yml")
@json_endpoint
def service_group_by_identifier(group_external_id: str):
    validate_service_token("scim_enabled")
    stripped_group_identifier = group_external_id.replace(EXTERNAL_ID_POST_FIX, "")
    group = Collaboration.query.filter(Collaboration.identifier == stripped_group_identifier).first()
    if not group:
        group = Group.query.filter(Group.identifier == stripped_group_identifier).one()
    return find_group_by_id_template(group), _add_etag_header(group)


@scim_api.route("/sweep", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/sweep.yml")
@json_endpoint
def sweep():
    try:
        service = validate_service_token("scim_enabled")
    except Unauthorized:
        confirm_write_access()
        service = Service.query.get(query_param("service_id"))
    return perform_sweep(service), 201
