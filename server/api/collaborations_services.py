# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request, g as request_context
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin, confirm_external_api_call, confirm_write_access
from server.db.db import db
from server.db.domain import Service, Collaboration
from server.schemas import json_schema_validator

collaborations_services_api = Blueprint("collaborations_services_api", __name__,
                                        url_prefix="/api/collaborations_services")


def connect_service_collaboration(service_id, collaboration_id, force=False):
    # Ensure that the connection is allowed
    service = Service.query.get(service_id)
    if service.allowed_organisations:
        organisation_id = Collaboration.query.get(collaboration_id).organisation_id
        if organisation_id not in list(map(lambda org: org.id, service.allowed_organisations)):
            raise BadRequest("not_allowed_organisation")

    if not force and not service.automatic_connection_allowed:
        raise BadRequest("automatic_connection_not_allowed")

    collaboration = Collaboration.query.get(collaboration_id)
    if collaboration.services_restricted:
        confirm_write_access()

    collaboration.services.append(service)
    db.session.merge(collaboration)
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
    return (None, 201) if count > 0 else (None, 404)


@collaborations_services_api.route("/v1/connect_collaboration_service", methods=["PUT"], strict_slashes=False)
@json_endpoint
def connect_collaboration_service_api():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation

    data = current_request.get_json()
    collaboration_id = int(data["collaboration_id"])

    if not any(coll.id == collaboration_id for coll in organisation.collaborations):
        raise Forbidden(f"Collaboration {collaboration_id} is not part of organisation {organisation.name}")

    service_entity_id = data["service_entity_id"]
    service = Service.query.filter(Service.entity_id == service_entity_id).one()

    count = connect_service_collaboration(service.id, collaboration_id)
    collaboration = list(filter(lambda coll: coll.id == collaboration_id, organisation.collaborations))[0]
    return ({
                "collaboration_id": collaboration.id,
                "collaboration_name": collaboration.name,
                "collaboration_urn": collaboration.global_urn,
                "organisation_name": organisation.name,
                "service_id": service.id,
                "service_name": service.name,
                "service_entity_id": service.entity_id,
                "status": "connected"
            }, 201) if count > 0 else (None, 404)


@collaborations_services_api.route("/delete_all_services/<collaboration_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_services(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    collaboration = Collaboration.query.get(collaboration_id)
    if collaboration.services_restricted:
        confirm_write_access()

    collaboration.services = []
    db.session.merge(collaboration)
    return None, 204


@collaborations_services_api.route("/<collaboration_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaborations_services(collaboration_id, service_id):
    confirm_collaboration_admin(collaboration_id)

    collaboration = Collaboration.query.get(collaboration_id)
    if collaboration.services_restricted:
        confirm_write_access()

    collaboration.services.remove(Service.query.get(service_id))
    db.session.merge(collaboration)
    return None, 204
