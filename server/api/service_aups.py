from flask import Blueprint, request as current_request, session

from server.api.base import json_endpoint
from server.auth.security import confirm_service_admin, current_user_id
from server.db.domain import db, ServiceAup, Service, User

service_aups_api = Blueprint("service_aups_api", __name__, url_prefix="/api/service_aups")


def add_user_aups(collaboration, user_id):
    user = db.session.get(User, user_id)
    for service in collaboration.services:
        if not has_agreed_with(user, service):
            db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user_id, service_id=service.id))
    return user


def has_agreed_with(user: User, service: Service):
    return bool(not service.accepted_user_policy or [aup for aup in user.service_aups if aup.service_id == service.id])


def do_create_service_aup(service_id):
    service = db.session.get(Service, int(service_id))
    user_id = current_user_id()
    user = db.session.get(User, user_id)
    if not has_agreed_with(user, service):
        db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user_id, service_id=service_id))


@service_aups_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_service_aup():
    data = current_request.get_json()
    service_id = data["service_id"]
    do_create_service_aup(service_id)
    return {}, 201


@service_aups_api.route("/bulk", methods=["POST"], strict_slashes=False)
@json_endpoint
def create_bulk_service_aup():
    data = current_request.get_json()
    service_identifiers = data["service_identifiers"]
    for service_id in service_identifiers:
        do_create_service_aup(service_id)
    location = session.get("original_destination", None)
    return {"location": location}, 201


@service_aups_api.route("/delete_by_service", methods=["PUT"], strict_slashes=False)
@json_endpoint
def delete_all():
    data = current_request.get_json()
    service_id = int(data["service_id"])

    confirm_service_admin(service_id)

    for service_aup in ServiceAup.query.filter(ServiceAup.service_id == service_id).all():
        db.session.delete(service_aup)
    return {}, 201
