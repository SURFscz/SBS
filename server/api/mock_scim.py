import json
import re
import uuid
from functools import wraps

from flask import Blueprint, g as request_context, current_app
from flask import request as current_request
from werkzeug.exceptions import BadRequest, Unauthorized

from server.api.base import query_param, json_endpoint
from server.auth.security import confirm_write_access
from server.db.domain import Service

scim_mock_api = Blueprint("scim_mock_api", __name__, url_prefix="/api/scim_mock")

# Global in-memory database and http call history
database = {}
http_calls = {}


def _check_authorization_header(service_id):
    authorization_header = current_request.headers.get("Authorization")
    if not authorization_header or not authorization_header.lower().startswith("bearer"):
        raise Unauthorized(description="Invalid bearer token")
    service = Service.query.filter(Service.id == service_id).one()
    if service.scim_bearer_token != authorization_header[len('bearer '):]:
        raise Unauthorized(description="Invalid bearer token")


def _log_scim_request(service_id):
    global http_calls
    service = http_calls.get(service_id, None)
    if service is None:
        service = []
        http_calls[service_id] = service
    method = current_request.method
    body = current_request.json if method in ["PUT", "POST"] and current_request.is_json else {}
    service.append({"method": method,
                    "path": current_request.path,
                    "args": current_request.args,
                    "body": json.dumps(body, default=str)})


def scim_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        service_id = current_request.headers.get("X-Service")
        _check_authorization_header(service_id)
        request_context.service_id = service_id
        _log_scim_request(service_id)
        return f(*args, **kwargs)

    return wrapper


def _get_database_service():
    service = database.get(request_context.service_id, None)
    if service is None:
        service = {"users": {}, "groups": {}}
        database[request_context.service_id] = service
    return service


def _find_scim_object(collection_name):
    service = _get_database_service()
    filter_param = query_param("filter", required=False)
    resources = list(service[collection_name].values())
    if not filter_param:
        return {"totalResults": len(resources), "Resources": resources}
    external_id = re.search(r"externalId eq \"(.*)\"", filter_param).groups()[0]
    res = list(filter(lambda obj: obj["externalId"] == external_id, resources))
    return {"totalResults": 1, "Resources": [res[0]]} if res else {"totalResults": 0}


def _new_scim_object(collection_name, collection_type):
    data = current_request.get_json()
    service = _get_database_service()
    new_id = str(uuid.uuid4())
    data["id"] = new_id
    data["meta"] = {
        "resourceType": collection_type,
        "location": f"/{collection_name.capitalize()}/{new_id}",
    }
    service[collection_name][new_id] = data
    return data


def _update_scim_object(scim_id, collection_name):
    data = current_request.get_json()
    service = _get_database_service()
    res = service[collection_name].get(scim_id)
    if not res:
        raise BadRequest(f"No scim {collection_name} found with id {scim_id}")
    new_entry = {**res, **data}
    service[collection_name][scim_id] = new_entry
    return new_entry


def _delete_scim_object(scim_id, collection_name):
    service = _get_database_service()
    res = service[collection_name].get(scim_id)
    if res:
        del service[collection_name][scim_id]
    return res if res else {}


@scim_mock_api.route("/Users", methods=["GET"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def find_user():
    return _find_scim_object("users"), 200


@scim_mock_api.route("/Users", methods=["POST"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def new_user():
    return _new_scim_object("users", "User"), 201


@scim_mock_api.route("/Users/<scim_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def update_user(scim_id):
    return _update_scim_object(scim_id, "users"), 201


@scim_mock_api.route("/Users/<scim_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def delete_user(scim_id):
    return _delete_scim_object(scim_id, "users"), 204


@scim_mock_api.route("/Groups", methods=["GET"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def find_group():
    return _find_scim_object("groups"), 200


@scim_mock_api.route("/Groups", methods=["POST"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def new_group():
    return _new_scim_object("groups", "Group"), 201


@scim_mock_api.route("/Groups/<scim_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def update_group(scim_id):
    return _update_scim_object(scim_id, "groups"), 201


@scim_mock_api.route("/Groups/<scim_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
@scim_endpoint
def delete_group(scim_id):
    return _delete_scim_object(scim_id, "groups"), 204


@scim_mock_api.route("/statistics", methods=["GET"], strict_slashes=False)
@json_endpoint
def statistics():
    confirm_write_access()

    res = {"database": database, "http_calls": http_calls}
    return res, 200


@scim_mock_api.route("/scim-services", methods=["GET"], strict_slashes=False)
@json_endpoint
def scim_service():
    confirm_write_access()

    scim_mock_url = f"{current_app.app_config.base_server_url}/api/scim_mock"
    return Service.query \
               .filter(Service.scim_url == scim_mock_url) \
               .filter(Service.scim_enabled == True).all(), 200  # noqa: E712


@scim_mock_api.route("/clear", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def clear():
    confirm_write_access()

    global database
    database = {}

    global http_calls
    http_calls = {}

    return {}, 204
