from flask import Blueprint, request as current_request
from sqlalchemy import text, func
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint
from server.db.db import Service, db
from server.db.models import update, save, delete

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")


@service_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    sql = text(f"SELECT id, entity_id, name, description FROM services "
               f"WHERE MATCH (name, entity_id, description) AGAINST ('{q}*' IN BOOLEAN MODE)")
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
def identifier_exists():
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
    return Service.query.get(service_id), 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    return save(Service)


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    return update(Service)


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    return delete(Service, service_id)
