# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import confirm_service_admin
from server.db.domain import db, ServiceAup

service_aups_api = Blueprint("service_aups_api", __name__, url_prefix="/api/service_aups")


def add_user_aups(collaboration, user_id):
    services = collaboration.services + collaboration.organisation.services
    for service in services:
        service_aup = ServiceAup.query \
            .filter(ServiceAup.user_id == user_id) \
            .filter(ServiceAup.service_id == service.id) \
            .first()
        if not service_aup:
            db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user_id, service_id=service.id))


@service_aups_api.route("/delete_by_service", methods=["PUT"], strict_slashes=False)
@json_endpoint
def delete_all():
    data = current_request.get_json()
    service_id = int(data["service_id"])

    confirm_service_admin(service_id)

    ServiceAup.query.filter(ServiceAup.service_id == service_id).delete()
    return {}, 201
