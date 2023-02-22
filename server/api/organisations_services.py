from flask import Blueprint, request as current_request
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint, emit_socket
from server.api.service_group import create_service_groups
from server.auth.security import confirm_organisation_admin_or_manager
from server.db.db import db
from server.db.domain import Service, Organisation
from server.schemas import json_schema_validator
from server.scim.events import broadcast_organisation_service_added, \
    broadcast_organisation_service_deleted

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
    organisation = Organisation.query.get(organisation_id)

    allowed_org = organisation in service.allowed_organisations
    automatic_allowed_org = organisation in service.automatic_connection_allowed_organisations
    is_allowed = allowed_org or automatic_allowed_org or service.access_allowed_for_all
    if not is_allowed:
        raise BadRequest("not_allowed_organisation")

    if not service.automatic_connection_allowed and not service.access_allowed_for_all and not automatic_allowed_org:
        raise BadRequest("automatic_connection_not_allowed")

    if organisation.services_restricted and not service.allow_restricted_orgs:
        raise BadRequest("SURF organisations can only connect to SURF services")

    organisation.services.append(service)
    db.session.merge(organisation)

    # Create groups from service_groups
    for collaboration in organisation.collaborations:
        create_service_groups(service, collaboration)

    db.session.commit()
    emit_socket(f"organisation_{organisation_id}")
    broadcast_organisation_service_added(organisation, service)

    return None, 201


@organisations_services_api.route("/<organisation_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisations_services(organisation_id, service_id):
    confirm_organisation_admin_or_manager(organisation_id)

    organisation = Organisation.query.get(organisation_id)

    service = Service.query.get(service_id)
    organisation.services.remove(service)
    db.session.merge(organisation)
    db.session.commit()

    emit_socket(f"organisation_{organisation_id}")
    broadcast_organisation_service_deleted(organisation, service)

    return None, 204
