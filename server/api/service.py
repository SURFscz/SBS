from flask import Blueprint, request as current_request
from sqlalchemy import text

from server.api.base import json_endpoint
from server.db.db import Service, db
from server.db.models import update, save, delete

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")


@service_api.route("/find_by_entity", strict_slashes=False)
@json_endpoint
def service_by_entity_id():
    entity_id = current_request.args.get("entity_id")
    service = Service.query.filter(Service.entity_id == entity_id).one()
    return service, 200


@service_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    sql = text(f"SELECT id, entity_id, name, description FROM services "
               f"WHERE MATCH (name, entity_id, description) AGAINST ('{q}*' IN BOOLEAN MODE)")
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    return save(Service)


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    return update(Service)


@service_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(id):
    return delete(Service, id)
