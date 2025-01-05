from flask import Blueprint, request as current_request, g as request_context
from sqlalchemy import func
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.group import create_group, auto_provision_all_members_and_invites
from server.auth.security import confirm_service_admin
from server.db.defaults import cleanse_short_name
from server.db.domain import ServiceGroup, Service, Collaboration, Group
from server.db.models import update, save, delete, flatten
from server.schemas import json_schema_validator
from server.scim.events import broadcast_group_changed

service_group_api = Blueprint("service_group_api", __name__, url_prefix="/api/servicegroups")


def create_service_group(service: Service, collaboration: Collaboration, service_group: ServiceGroup):
    data = {
        "name": service_group.name,
        "description": service_group.description,
        "short_name": f"{service.abbreviation}-{service_group.short_name}",
        "collaboration_id": collaboration.id,
        "auto_provision_members": service_group.auto_provision_members,
        "service_group_id": service_group.id
    }
    create_group(collaboration.id, data, do_cleanse_short_name=False)


def create_service_groups(service: Service, collaboration: Collaboration):
    for service_group in service.service_groups:
        create_service_group(service, collaboration, service_group)


@service_group_api.route("/find_by_service_uuid/<service_uuid4>", strict_slashes=False)
@json_endpoint
def find_by_service_uuid(service_uuid4):
    service_groups = ServiceGroup.query \
        .options(load_only(ServiceGroup.name, ServiceGroup.description)) \
        .join(ServiceGroup.service) \
        .filter(Service.uuid4 == service_uuid4) \
        .all()
    return service_groups, 200


@service_group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def service_group_name_exists():
    confirm_service_admin()

    name = query_param("name")
    service_id = query_param("service_id")
    existing_service_group = query_param("existing_service_group", required=False, default="")
    service_group = ServiceGroup.query.options(load_only(ServiceGroup.id)) \
        .filter(func.lower(ServiceGroup.name) == func.lower(name)) \
        .filter(func.lower(ServiceGroup.name) != func.lower(existing_service_group)) \
        .filter(ServiceGroup.service_id == service_id) \
        .first()
    return service_group is not None, 200


@service_group_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def service_group_short_name_exists():
    confirm_service_admin()

    short_name = query_param("short_name")
    service_id = query_param("service_id")
    existing_service_group = query_param("existing_service_group", required=False, default="")
    service_group = ServiceGroup.query.options(load_only(ServiceGroup.id)) \
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
    service_id = data.get('service_id')

    confirm_service_admin(service_id)
    cleanse_short_name(data)

    res = save(ServiceGroup, custom_json=data, allow_child_cascades=False)
    service_group = res[0]
    service = service_group.service
    collaborations = list(set(flatten([org.collaborations for org in service.organisations]) + service.collaborations))

    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True

    for collaboration in collaborations:
        create_service_group(service, collaboration, service_group)

    emit_socket(f"service_{service_id}")
    return res


@service_group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service_group():
    data = current_request.get_json()
    service_id = data.get('service_id')
    confirm_service_admin(service_id)

    cleanse_short_name(data)

    res = update(ServiceGroup, custom_json=data, allow_child_cascades=False)
    service_group = res[0]
    service = service_group.service
    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True
    for group in service_group.groups:
        short_name = f"{service.abbreviation}-{service_group.short_name}"
        collaboration = group.collaboration
        group_data = {
            "id": group.id,
            "name": service_group.name,
            "short_name": short_name,
            "description": service_group.description,
            # See https://github.com/SURFscz/SBS/issues/1592, what is the expected behaviour? Ignore when different?
            "auto_provision_members": service_group.auto_provision_members,
            "global_urn": f"{collaboration.organisation.short_name}:{collaboration.short_name}:{short_name}",
            "identifier": group.identifier,
            "collaboration_id": collaboration.id,
            "service_group_id": service_group.id
        }
        updated_group = update(Group, custom_json=group_data, allow_child_cascades=False)[0]
        auto_provision_all_members_and_invites(updated_group)
        broadcast_group_changed(updated_group.id)

    emit_socket(f"service_{service_id}")

    for co_id in {g.collaboration_id for g in service_group.groups}:
        emit_socket(f"collaboration_{co_id}")

    return res


@service_group_api.route("/<service_group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_group(service_group_id):
    # Return 404 if not found
    service_group = ServiceGroup.query.filter(ServiceGroup.id == service_group_id).one()
    confirm_service_admin(service_group.service_id)

    emit_socket(f"service_{service_group.service_id}")

    for co_id in {g.collaboration_id for g in service_group.groups}:
        emit_socket(f"collaboration_{co_id}")
    return delete(ServiceGroup, service_group_id)
