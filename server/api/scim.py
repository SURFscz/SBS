# -*- coding: future_fstrings -*-
from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.tokens import validate_service_token
from server.db.domain import User, CollaborationMembership, Service, Collaboration

scim_api = Blueprint("scim_api", __name__, url_prefix="/api/scim")

"""
GET /api/scim/Users
GET /api/scim/Users/<id>
GET /api/scim/Groups
GET /api/scim/Groups/<id>
"""


@scim_api.route("/Users", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_users():
    service = validate_service_token("scim_enabled")
    users = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    return users, 200


@scim_api.route("/Users/<user_external_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_user_by_external_id(user_external_id):
    return {}


@scim_api.route("/Groups", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_groups():
    return []


@scim_api.route("/Groups/<group_identifier>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_group_by_identifier(group_identifier):
    return {}
