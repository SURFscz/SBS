# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.db import db

collaborations_services_api = Blueprint("collaborations_services_api", __name__,
                                        url_prefix="/api/collaborations_services")


@collaborations_services_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_collaborations_services():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]

    confirm_collaboration_admin(collaboration_id)

    service_ids = data["service_ids"]
    if len(service_ids) is 0:
        return None, 201

    values = ",".join(list(map(lambda id: f"({id},{collaboration_id})", service_ids)))
    statement = f"REPLACE into services_collaborations (service_id, collaboration_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@collaborations_services_api.route("/delete_all_services/<collaboration_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_services(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from services_collaborations WHERE collaboration_id = {collaboration_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@collaborations_services_api.route("/<collaboration_id>/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaborations_services(collaboration_id, service_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from services_collaborations WHERE service_id = {service_id}" \
        f" AND collaboration_id = {collaboration_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
