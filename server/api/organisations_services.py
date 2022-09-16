# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.api.service_group import create_service_groups
from server.auth.security import confirm_organisation_admin_or_manager, confirm_write_access
from server.db.db import db
from server.db.domain import Service, Organisation
from server.schemas import json_schema_validator

organisations_services_api = Blueprint("organisations_services_api", __name__,
                                       url_prefix="/api/organisations_services")


@organisations_services_api.route("/", methods=["PUT"], strict_slashes=False)
@json_schema_validator.validate("models", "organisations_services")
@json_endpoint
def add_collaborations_services():
    data = current_request.get_json()
    organisation_id = int(data["organisation_id"])
    service_id = int(data["service_id"])

    confirm_organisation_admin_or_manager(organisation_id)
    # Ensure that the connection is allowed
    service = Service.query.get(service_id)
    is_allowed = organisation_id in list(
        map(lambda org: org.id, service.allowed_organisations)) or service.access_allowed_for_all
    if not is_allowed:
        raise BadRequest("not_allowed_organisation")

    if not service.automatic_connection_allowed and not service.access_allowed_for_all:
        raise BadRequest("automatic_connection_not_allowed")

    organisation = Organisation.query.get(organisation_id)

    if organisation.services_restricted and not service.white_listed:
        raise BadRequest("SURG org can only connect SURF services")

    organisation.services.append(service)
    db.session.merge(organisation)
    # Create groups from service_groups
    for collaboration in organisation.collaborations:
        create_service_groups(service, collaboration)

    return None, 201


@organisations_services_api.route("/<organisation_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisations_services(organisation_id, service_id):
    confirm_organisation_admin_or_manager(organisation_id)

    organisation = Organisation.query.get(organisation_id)

    if organisation.services_restricted:
        confirm_write_access()

    organisation.services.remove(Service.query.get(service_id))
    db.session.merge(organisation)

    return None, 204
