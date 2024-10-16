import re
import traceback
import urllib.parse
from typing import Union

import requests
from cryptography.exceptions import InvalidTag
from flasgger import swag_from
from flask import Blueprint, Response
from sqlalchemy import func
from werkzeug.exceptions import Unauthorized, BadRequest

from server.api.base import json_endpoint, query_param, send_error_mail
from server.auth.security import confirm_write_access, is_service_admin
from server.auth.tokens import validate_service_token
from server.db.db import db
from server.db.defaults import SERVICE_TOKEN_SCIM
from server.db.domain import User, Collaboration, Group, Service
from server.logger.context_logger import ctx_logger
from server.scim import SCIM_URL_PREFIX, EXTERNAL_ID_POST_FIX
from server.scim.group_template import find_groups_template, find_group_by_id_template
from server.scim.repo import all_scim_users_by_service, all_scim_groups_by_service
from server.scim.resource_type_template import resource_type_template, resource_type_user_template, \
    resource_type_group_template
from server.scim.schema_template import schemas_template, \
    schema_core_user_template, schema_core_group_template, \
    schema_sram_user_template, schema_sram_group_template, \
    SCIM_SCHEMA_CORE_USER, SCIM_SCHEMA_CORE_GROUP, \
    SCIM_SCHEMA_SRAM_USER, SCIM_SCHEMA_SRAM_GROUP
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
def schema_core_user():
    return schema_core_user_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_CORE_GROUP}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_core_group():
    return schema_core_group_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_SRAM_USER}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_sram_user():
    return schema_sram_user_template(), 200


@scim_api.route(f"/Schemas/{SCIM_SCHEMA_SRAM_GROUP}", methods=["GET"], strict_slashes=False)
@json_endpoint
def schema_sram_group():
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
    service = validate_service_token("scim_client_enabled", SERVICE_TOKEN_SCIM)
    filter_param = query_param("filter", required=False)
    # note: we only support "eq" here.
    if filter_param:
        query = urllib.parse.unquote(filter_param)
        if not query.lower().startswith(f"{SCIM_SCHEMA_SRAM_USER}.eduPersonUniqueId".lower()):
            raise NotImplementedError(f"Not supported filter {query}")
        uid = re.search(r"(?:'|\")(.*)(?:'|\")", query).group(1)
        users = User.query.filter(func.lower(User.uid) == func.lower(uid)).all()
    else:
        users = all_scim_users_by_service(service)
    return find_users_template(users), 200


@scim_api.route("/Users/<user_external_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_user_by_external_id.yml")
@json_endpoint
def service_user_by_external_id(user_external_id: str):
    validate_service_token("scim_client_enabled", SERVICE_TOKEN_SCIM)
    stripped_external_id = user_external_id.replace(EXTERNAL_ID_POST_FIX, "")
    user = User.query.filter(User.external_id == stripped_external_id).one()
    return find_user_by_id_template(user), _add_etag_header(user)


@scim_api.route("/Groups", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_groups.yml")
@json_endpoint
def service_groups():
    service = validate_service_token("scim_client_enabled", SERVICE_TOKEN_SCIM)
    all_scim_groups = all_scim_groups_by_service(service)
    return find_groups_template(all_scim_groups), 200


@scim_api.route("/Groups/<group_external_id>", methods=["GET"], strict_slashes=False)
@swag_from("../swagger/public/paths/get_group_by_external_id.yml")
@json_endpoint
def service_group_by_identifier(group_external_id: str):
    validate_service_token("scim_client_enabled", SERVICE_TOKEN_SCIM)
    stripped_group_identifier = group_external_id.replace(EXTERNAL_ID_POST_FIX, "")
    group = Collaboration.query.filter(Collaboration.identifier == stripped_group_identifier).first()
    if not group:
        group = Group.query.filter(Group.identifier == stripped_group_identifier).one()
    return find_group_by_id_template(group), _add_etag_header(group)


@scim_api.route("/sweep", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/sweep.yml")
@json_endpoint
def sweep():
    logger = ctx_logger("scim_sweep")

    try:
        service = validate_service_token("scim_enabled", SERVICE_TOKEN_SCIM)
    except Unauthorized:
        service_id = query_param("service_id", required=False, default=0)
        confirm_write_access(service_id, override_func=is_service_admin)
        service = db.session.get(Service, service_id)

    try:
        results = perform_sweep(service)
        results["scim_url"] = service.scim_url
        return results, 201
    except BadRequest as bad_request:
        logger.warning(f"Error from remote SCIM server for {service.entity_id}: {bad_request.description}")
        return {"error": f"Error from remote scim server: {bad_request.description}",
                "scim_url": service.scim_url}, 400
    except requests.RequestException as request_exception:
        logger.warning(f"Could not connect to remote SCIM server {service.scim_url} for {service.entity_id}:"
                       f" {type(request_exception).__name__}")
        return {"error": f"Could not connect to remote SCIM server ({type(request_exception).__name__})"
                         f"{': ' + request_exception.response.text if request_exception.response else ''}",
                "scim_url": service.scim_url}, 400
    except InvalidTag:
        exc = traceback.format_exc()
        logger.error(f"Could not decrypt SCIM bearer secret for service {service.entity_id}\n{exc}")
        send_error_mail(tb=f"Could not decrypt SCIM bearer secret for service {service.entity_id}\n\n{exc}")
        return {"error": "Could not decrypt SCIM bearer secret",
                "scim_url": service.scim_url}, 400
    except Exception:
        logger.error(f"Unknown error while connecting to remote SCIM server {service.scim_url} for "
                     f"{service.entity_id}: {traceback.format_exc()}")
        return {"error": "Unknown error while connecting to remote SCIM server",
                "scim_url": service.scim_url}, 500


@scim_api.route("/scim-services", methods=["GET"], strict_slashes=False)
@json_endpoint
def scim_service():
    confirm_write_access()
    return Service.query.filter(Service.scim_enabled == True).all(), 200  # noqa: E712
