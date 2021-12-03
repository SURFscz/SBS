# -*- coding: future_fstrings -*-
from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import confirm_service_admin
from server.db.db import db
from server.db.domain import ServiceMembership

service_membership_api = Blueprint("service_membership_api", __name__,
                                   url_prefix="/api/service_memberships")


@service_membership_api.route("/<service_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_membership(service_id, user_id):
    confirm_service_admin(service_id)

    memberships = ServiceMembership.query \
        .filter(ServiceMembership.service_id == service_id) \
        .filter(ServiceMembership.user_id == user_id) \
        .all()
    for membership in memberships:
        db.session.delete(membership)
    return (None, 204) if len(memberships) > 0 else (None, 404)
