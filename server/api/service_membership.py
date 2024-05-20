from flask import Blueprint, request as current_request
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, emit_socket
from server.auth.security import confirm_service_admin, confirm_write_access, current_user_id, current_user_uid
from server.db.db import db
from server.db.domain import ServiceMembership, Service

service_membership_api = Blueprint("service_membership_api", __name__,
                                   url_prefix="/api/service_memberships")


@service_membership_api.route("/<service_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_membership(service_id, user_id):
    try:
        confirm_service_admin(service_id)
    except Forbidden as e:
        # A Service Manager may delete its own membership
        if current_user_id() != int(user_id):
            raise e

    membership = ServiceMembership.query \
        .filter(ServiceMembership.service_id == service_id) \
        .filter(ServiceMembership.user_id == user_id) \
        .one()
    db.session.delete(membership)

    emit_socket(f"service_{service_id}", include_current_user_id=True)

    return None, 204


@service_membership_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_service_membership_role():
    confirm_write_access()

    service_id = current_request.get_json()["serviceId"]
    service = db.session.get(Service, service_id)

    service_membership = ServiceMembership(user_id=current_user_id(),
                                           service_id=service.id,
                                           role="admin",
                                           created_by=current_user_uid(),
                                           updated_by=current_user_uid())
    emit_socket(f"service_{service_id}", include_current_user_id=True)

    db.session.merge(service_membership)
    return service_membership, 201


@service_membership_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service_membership_role():
    client_data = current_request.get_json()
    service_id = client_data["serviceId"]
    user_id = client_data["userId"]
    role = client_data["role"]

    confirm_service_admin(service_id)

    service_membership = ServiceMembership.query \
        .filter(ServiceMembership.service_id == service_id) \
        .filter(ServiceMembership.user_id == user_id) \
        .one()
    service_membership.role = role

    emit_socket(f"service_{service_id}", include_current_user_id=True)

    db.session.merge(service_membership)
    return service_membership, 201
