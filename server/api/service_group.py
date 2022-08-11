# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request
from sqlalchemy import func
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint, query_param
from server.api.group import create_group
from server.auth.security import confirm_write_access
from server.db.defaults import cleanse_short_name
from server.db.domain import ServiceGroup, Service, Collaboration
from server.db.models import update, save, delete
from server.schemas import json_schema_validator

service_group_api = Blueprint("service_group_api", __name__, url_prefix="/api/servicegroups")


def create_service_groups(service: Service, collaboration: Collaboration):
    for service_group in service.service_groups:
        data = {
            "name": service_group.name,
            "description": f"Provisioned by service {service.name} - {service_group.description}",
            "short_name": f"{service.abbreviation}-{service_group.short_name}",
            "collaboration_id": collaboration.id,
            "auto_provision_members": service_group.auto_provision_members
        }
        create_group(collaboration.id, data, do_cleanse_short_name=False)


@service_group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def service_group_name_exists():
    name = query_param("name")
    service_id = query_param("service_id")
    existing_service_group = query_param("existing_service_group", required=False, default="")
    service_group = ServiceGroup.query.options(load_only("id")) \
        .filter(func.lower(ServiceGroup.name) == func.lower(name)) \
        .filter(func.lower(ServiceGroup.name) != func.lower(existing_service_group)) \
        .filter(ServiceGroup.service_id == service_id) \
        .first()
    return service_group is not None, 200


@service_group_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def service_group_short_name_exists():
    short_name = query_param("short_name")
    service_id = query_param("service_id")
    existing_service_group = query_param("existing_service_group", required=False, default="")
    service_group = ServiceGroup.query.options(load_only("id")) \
        .filter(func.lower(ServiceGroup.short_name) == func.lower(short_name)) \
        .filter(func.lower(ServiceGroup.short_name) != func.lower(existing_service_group)) \
        .filter(ServiceGroup.service_id == service_id) \
        .first()
    return service_group is not None, 200


@service_group_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "service_groups")
def save_service_group():
    data = current_request.get_json()
    confirm_write_access()
    cleanse_short_name(data)
    return save(ServiceGroup, custom_json=data, allow_child_cascades=False)


@service_group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service_group():
    data = current_request.get_json()
    confirm_write_access()
    cleanse_short_name(data)
    return update(ServiceGroup, custom_json=data, allow_child_cascades=False)


@service_group_api.route("/<service_group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_group(service_group_id):
    confirm_write_access()
    # Return 404 if not found
    ServiceGroup.query.filter(ServiceGroup.id == service_group_id).one()
    return delete(ServiceGroup, service_group_id)
