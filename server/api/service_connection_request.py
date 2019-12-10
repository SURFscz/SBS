# -*- coding: future_fstrings -*-

from flask import Blueprint
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.db.db import ServiceConnectionRequest

service_connection_request_api = Blueprint("service_connection_request_api", __name__,
                                           url_prefix="/api/service_connection_requests")


@service_connection_request_api.route("/find_by_hash/<service_connection_request_hash>", strict_slashes=False)
@json_endpoint
def service_connection_request_by_hash(service_connection_request_hash):
    service_connection_request = ServiceConnectionRequest.query.join(ServiceConnectionRequest.service).join(
        ServiceConnectionRequest.collaboration).join(ServiceConnectionRequest.requester).options(
        contains_eager(ServiceConnectionRequest.service)).options(
        contains_eager(ServiceConnectionRequest.collaboration)).options(
        contains_eager(ServiceConnectionRequest.requester)).filter(
        ServiceConnectionRequest.hash == service_connection_request_hash).one()

    return service_connection_request, 200
