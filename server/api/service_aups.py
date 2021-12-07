# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import confirm_service_admin, current_user_id
from server.db.domain import db, ServiceAup, Service, User

service_aups_api = Blueprint("service_aups_api", __name__, url_prefix="/api/service_aups")


def add_user_aups(collaboration, user_id):
    user = User.query.get(user_id)
    services = collaboration.services + collaboration.organisation.services
    for service in services:
        if not has_agreed_with(user, service):
            db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user_id, service_id=service.id))


def has_agreed_with(user, service):
    return not service.accepted_user_policy or ServiceAup.query \
        .filter(ServiceAup.service_id == service.id) \
        .filter(ServiceAup.user_id == user.id) \
        .count() > 0


@service_aups_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_service_aup():
    data = current_request.get_json()
    service_id = int(data["service_id"])
    service = Service.query.get(service_id)
    user_id = current_user_id()
    user = User.query.get(user_id)
    if not has_agreed_with(user, service):
        db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user_id, service_id=service_id))
    return {}, 201


@service_aups_api.route("/delete_by_service", methods=["PUT"], strict_slashes=False)
@json_endpoint
def delete_all():
    data = current_request.get_json()
    service_id = int(data["service_id"])

    confirm_service_admin(service_id)

    ServiceAup.query.filter(ServiceAup.service_id == service_id).delete()
    return {}, 201
