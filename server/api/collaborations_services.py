from flasgger import swag_from
from flask import Blueprint, request as current_request, g as request_context
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint, emit_socket
from server.api.service_group import create_service_groups
from server.auth.security import confirm_collaboration_admin, confirm_external_api_call, confirm_service_admin
from server.db.db import db
from server.db.domain import Service, Collaboration, Organisation
from server.schemas import json_schema_validator
from server.scim.events import broadcast_service_added, broadcast_service_deleted

collaborations_services_api = Blueprint("collaborations_services_api", __name__,
                                        url_prefix="/api/collaborations_services")


def connect_service_collaboration(service_id, collaboration_id, force=False):
    # Ensure that the connection is allowed
    service = db.session.get(Service, service_id)
    collaboration = db.session.get(Collaboration, collaboration_id)
    organisation = Organisation.query.filter(Organisation.id == collaboration.organisation_id).one()
    org_allowed = organisation in service.allowed_organisations
    org_automatic_allowed = organisation in service.automatic_connection_allowed_organisations

    if not org_allowed and not org_automatic_allowed \
       and not service.automatic_connection_allowed and not service.access_allowed_for_all:
        raise BadRequest("not_allowed_organisation")

    allowed_to_connect = service.automatic_connection_allowed or org_automatic_allowed
    if not force and not allowed_to_connect:
        raise BadRequest("automatic_connection_not_allowed")

    if organisation.services_restricted and not service.allow_restricted_orgs:
        raise BadRequest(f"Organisation {collaboration.organisation.name} can only be linked to SURF services")

    collaboration.services.append(service)
    db.session.merge(collaboration)

    # Create groups from service_groups
    create_service_groups(service, collaboration)

    db.session.commit()

    emit_socket(f"collaboration_{collaboration.id}")
    emit_socket(f"service_{service.id}", include_current_user_id=True)
    broadcast_service_added(collaboration.id, service.id)

    return 1


@collaborations_services_api.route("/", methods=["PUT"], strict_slashes=False)
@json_schema_validator.validate("models", "collaborations_services")
@json_endpoint
def add_collaborations_services():
    data = current_request.get_json()
    collaboration_id = int(data["collaboration_id"])

    confirm_collaboration_admin(collaboration_id)

    service_id = int(data["service_id"])

    count = connect_service_collaboration(service_id, collaboration_id)
    res = {'collaboration_id': collaboration_id, 'service_id': service_id}

    return (res, 201) if count > 0 else (None, 404)


@collaborations_services_api.route("/v1/connect_collaboration_service", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/connect_collaboration_service.yml")
@json_endpoint
def connect_collaboration_service_api():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation

    data = current_request.get_json()
    coll_short_name = data["short_name"]

    collaborations = list(filter(lambda coll: coll.short_name == coll_short_name, organisation.collaborations))
    if not collaborations:
        raise Forbidden(f"Collaboration {coll_short_name} is not part of organisation {organisation.name}")

    collaboration = collaborations[0]
    service_entity_id = data["service_entity_id"]
    service = Service.query.filter(Service.entity_id == service_entity_id).one()

    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True

    if service.automatic_connection_allowed or organisation in service.automatic_connection_allowed_organisations:
        connect_service_collaboration(service.id, collaboration.id, force=True)
        status = "connected"
    else:
        # Avoid cyclic imports
        from server.api.service_connection_request import request_new_service_connection

        admins = [cm.user for cm in collaboration.collaboration_memberships if cm.role == "admin"]
        if not admins:
            raise BadRequest(f"Collaboration {collaboration.short_name} has no administrator")
        request_new_service_connection(collaboration, None, service, admins[0])
        status = "pending"

    return {"status": status,
            "collaboration": {
                "organisation_short_name": organisation.short_name,
                "short_name": collaboration.short_name
            },
            "service": {"entity_id": service.entity_id}}, 201


@collaborations_services_api.route("/<int:collaboration_id>/<int:service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaborations_services(collaboration_id, service_id):
    try:
        confirm_collaboration_admin(collaboration_id)
    except Forbidden:
        confirm_service_admin(service_id)

    collaboration = db.session.get(Collaboration, collaboration_id)

    service = db.session.get(Service, service_id)
    collaboration.services.remove(service)
    db.session.merge(collaboration)
    db.session.commit()

    emit_socket(f"collaboration_{collaboration.id}")
    emit_socket(f"service_{service.id}")
    broadcast_service_deleted(collaboration.id, service.id)

    return {'collaboration_id': collaboration_id, 'service_id': service_id}, 204
