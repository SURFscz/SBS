from flask import Blueprint, request as current_request
from sqlalchemy import text, func
from sqlalchemy.orm import load_only, contains_eager

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.db import Service, db, Collaboration
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.models import update, save, delete

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")


@service_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    base_query = "SELECT id, entity_id, name, description FROM services "
    if q != "*":
        base_query += f"WHERE MATCH (name, entity_id, description) AGAINST ('{q}*' IN BOOLEAN MODE) " \
            f"AND id > 0 LIMIT {full_text_search_autocomplete_limit}"
    sql = text(base_query)
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "entity_id": row[1], "name": row[2], "description": row[3]} for row in result_set]
    return res, 200


@service_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = current_request.args.get("name")
    existing_service = current_request.args.get("existing_service", "")
    org = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.name) == func.lower(name)) \
        .filter(func.lower(Service.name) != func.lower(existing_service)) \
        .first()
    return org is not None, 200


@service_api.route("/entity_id_exists", strict_slashes=False)
@json_endpoint
def entity_id_exists():
    entity_id = current_request.args.get("entity_id")
    existing_service = current_request.args.get("existing_service", "")
    org = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.entity_id) == func.lower(entity_id)) \
        .filter(func.lower(Service.entity_id) != func.lower(existing_service)) \
        .first()
    return org is not None, 200


@service_api.route("/<service_id>", strict_slashes=False)
@json_endpoint
def service_by_id(service_id):
    service = Service.query \
        .outerjoin(Service.collaborations) \
        .outerjoin(Collaboration.organisation) \
        .options(contains_eager(Service.collaborations)
                 .contains_eager(Collaboration.organisation)) \
        .filter(Service.id == service_id).one()
    return service, 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    confirm_write_access()
    return save(Service)


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    confirm_write_access()
    return update(Service, allow_child_cascades=False)


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    confirm_write_access()
    return delete(Service, service_id)
