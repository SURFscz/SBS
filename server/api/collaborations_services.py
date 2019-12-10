# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from sqlalchemy import text
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.db import db, Service, Collaboration
from server.schemas import json_schema_validator

collaborations_services_api = Blueprint("collaborations_services_api", __name__,
                                        url_prefix="/api/collaborations_services")


def connect_service_collaboration(service_id, collaboration_id, force=False):
    # Ensure that the connection is allowed
    service = Service.query.get(service_id)
    if not force and not service.automatic_connection_allowed:
        raise BadRequest("automatic_connection_allowed")

    if service.allowed_organisations:
        organisation_id = Collaboration.query.get(collaboration_id).organisation_id
        if organisation_id not in list(map(lambda org: org.id, service.allowed_organisations)):
            raise BadRequest("allowed_organisations")

    statement = f"REPLACE into services_collaborations (service_id, collaboration_id) " \
                f"VALUES ({service_id},{collaboration_id})"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return result_set


@collaborations_services_api.route("/", methods=["PUT"], strict_slashes=False)
@json_schema_validator.validate("models", "collaborations_services")
@json_endpoint
def add_collaborations_services():
    data = current_request.get_json()
    collaboration_id = int(data["collaboration_id"])

    confirm_collaboration_admin(collaboration_id)

    service_id = int(data["service_id"])

    result_set = connect_service_collaboration(service_id, collaboration_id)
    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@collaborations_services_api.route("/delete_all_services/<collaboration_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_services(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from services_collaborations WHERE collaboration_id = {int(collaboration_id)}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@collaborations_services_api.route("/<collaboration_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaborations_services(collaboration_id, service_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from services_collaborations WHERE service_id = {int(service_id)}" \
                f" AND collaboration_id = {int(collaboration_id)}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
