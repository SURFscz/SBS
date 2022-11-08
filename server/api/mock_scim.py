# -*- coding: future_fstrings -*-

import re

from flask import Blueprint
from flask import request as current_request
from sqlalchemy import text

from server.api.base import json_endpoint, query_param
from server.db.db import db

scim_mock_api = Blueprint("scim_mock_api", __name__, url_prefix="/api/scim_mock")

database = {
    "users": [],
    "groups": []
}


@scim_mock_api.route("/Users", methods=["GET"], strict_slashes=False)
@json_endpoint
def find_user():
    filter_param = query_param("filter")
    external_id = re.search(r"externalId eq \"(.*)\"", filter_param)
    res = list(filter(lambda user: user["external_id"] == external_id, database["users"]))
    return res[0] if res else None, 201


@scim_mock_api.route("/Users", methods=["POST"], strict_slashes=False)
@json_endpoint
def new_user():
    data = current_request.get_json()
    global database
    return None, 201


@scim_mock_api.route("/Users/<scim_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user(scim_id):
    data = current_request.get_json()
    global database
    return None, 201


@scim_mock_api.route("/Groups", methods=["GET"], strict_slashes=False)
@json_endpoint
def find_group():
    filter_param = query_param("filter")
    global database
    return None, 201


@scim_mock_api.route("/Groups", methods=["POST"], strict_slashes=False)
@json_endpoint
def new_group():
    data = current_request.get_json()
    global database
    return None, 201


@scim_mock_api.route("/Groups/<scim_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_group(scim_id):
    data = current_request.get_json()
    global database
    return None, 201


@scim_mock_api.route("/services", methods=["GET"], strict_slashes=False)
@json_endpoint
def services():
    sql = "SELECT s.name, c.counter FROM scim_service_counters c INNER JOIN services s ON s.id = c.service_id"
    rows = db.session.execute(text(sql))
    result = [{row[0], row[1]} for row in rows]
    return sorted(result, key=lambda k: k["counter"], reverse=True), 200
