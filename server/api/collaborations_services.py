from flasgger import swag_from
from flask import Blueprint, request as current_request, g as request_context
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint, emit_socket
from server.api.service_group import create_service_groups
from server.auth.security import confirm_collaboration_admin, confirm_external_api_call, confirm_service_admin
from server.db.db import db
from server.db.domain import Service, Collaboration
from server.schemas import json_schema_validator
from server.scim.events import broadcast_service_added, broadcast_service_deleted

collaborations_services_api = Blueprint("collaborations_services_api", __name__,
                                        url_prefix="/api/collaborations_services")


def connect_service_collaboration(service_id, collaboration_id, force=False):
    # Ensure that the connection is allowed
    service = Service.query.get(service_id)
    organisation_id = Collaboration.query.get(collaboration_id).organisation_id
    organisation_not_allowed = organisation_id not in list(map(lambda org: org.id, service.allowed_organisations))
    if organisation_not_allowed and not service.access_allowed_for_all:
        raise BadRequest("not_allowed_organisation")

    if not force and not service.automatic_connection_allowed:
        raise BadRequest("automatic_connection_not_allowed")

    collaboration = Collaboration.query.get(collaboration_id)
    if collaboration.organisation.services_restricted and not service.white_listed:
        raise BadRequest(f"Organisation {collaboration.organisation.name} can only be linked to SURF services")

    collaboration.services.append(service)
    db.session.merge(collaboration)
    db.session.commit()

    # Create groups from service_groups
    create_service_groups(service, collaboration)

    emit_socket(f"collaboration_{collaboration.id}")
    broadcast_service_added(collaboration, service)

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

    if service.automatic_connection_allowed:
        connect_service_collaboration(service.id, collaboration.id)
        status = "connected"
    else:
        # Avoid cyclic imports
        from server.api.service_connection_request import request_new_service_connection

        admins = [cm.user for cm in collaboration.collaboration_memberships if cm.role == "admin"]
        if not admins:
            raise BadRequest(f"Collaboration {collaboration.short_name} has no administrator")
        request_new_service_connection(collaboration, None, True, service, admins[0])
        status = "pending"

    return {"status": status,
            "collaboration": {"organisation_short_name": organisation.short_name, "short_name": coll_short_name},
            "service": {"entity_id": service.entity_id}}, 201


@collaborations_services_api.route("/<collaboration_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaborations_services(collaboration_id, service_id):
    try:
        confirm_collaboration_admin(collaboration_id)
    except Forbidden:
        confirm_service_admin(service_id)

    collaboration = Collaboration.query.get(collaboration_id)

    service = Service.query.get(service_id)
    collaboration.services.remove(service)
    db.session.merge(collaboration)

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)
    broadcast_service_deleted(collaboration, service)

    return {'collaboration_id': collaboration_id, 'service_id': service_id}, 204
