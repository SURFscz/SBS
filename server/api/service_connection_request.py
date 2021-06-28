# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app
from sqlalchemy.orm import contains_eager, load_only
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint
from server.api.collaborations_services import connect_service_collaboration
from server.auth.security import confirm_collaboration_admin, current_user_id, current_user_uid, current_user_name, \
    confirm_write_access, confirm_collaboration_member
from server.db.domain import ServiceConnectionRequest, Service, Collaboration, db
from server.db.models import delete
from server.mail import mail_service_connection_request, mail_accepted_declined_service_connection_request

service_connection_request_api = Blueprint("service_connection_request_api", __name__,
                                           url_prefix="/api/service_connection_requests")


def _service_connection_request_query():
    return ServiceConnectionRequest.query \
        .join(ServiceConnectionRequest.service) \
        .join(ServiceConnectionRequest.collaboration) \
        .join(ServiceConnectionRequest.requester) \
        .options(contains_eager(ServiceConnectionRequest.service)) \
        .options(contains_eager(ServiceConnectionRequest.collaboration)) \
        .options(contains_eager(ServiceConnectionRequest.requester))


def _service_connection_request_by_hash(hash):
    return _service_connection_request_query() \
        .filter(ServiceConnectionRequest.hash == hash) \
        .one()


def _do_service_connection_request(hash, approved):
    service_connection_request = _service_connection_request_by_hash(hash)
    service = service_connection_request.service
    collaboration = service_connection_request.collaboration

    if approved:
        connect_service_collaboration(service.id, collaboration.id, force=True)

    db.session.delete(service_connection_request)

    requester = service_connection_request.requester
    context = {"salutation": f"Dear {service_connection_request.requester.name},",
               "base_url": current_app.app_config.base_url,
               "service": service,
               "collaboration": collaboration}
    mail_accepted_declined_service_connection_request(context, service.name, collaboration.name, approved,
                                                      [requester.email])
    return {}, 201


def _do_mail_request(collaboration, service, service_connection_request, is_admin):
    recipients = []
    if is_admin and service.contact_email:
        recipients.append(service.contact_email)
    else:
        for membership in collaboration.collaboration_memberships:
            if membership.role == "admin":
                recipients.append(membership.user.email)
    if len(recipients) > 0:
        context = {"salutation": f"Dear {service.contact_email}",
                   "base_url": current_app.app_config.base_url,
                   "requester": current_user_name(),
                   "service_connection_request": service_connection_request,
                   "service": service,
                   "collaboration": collaboration}
        mail_service_connection_request(context, service.name, collaboration.name, recipients, is_admin)


@service_connection_request_api.route("/by_service/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_request_connections_by_service(service_id):
    # Avoid security risk, only return id
    return ServiceConnectionRequest.query \
               .options(load_only("collaboration_id")) \
               .filter(ServiceConnectionRequest.service_id == service_id) \
               .all(), 200


@service_connection_request_api.route("/<service_connection_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_request_connection(service_connection_request_id):
    service_connection_request = ServiceConnectionRequest.query.get(service_connection_request_id)

    confirm_collaboration_admin(service_connection_request.collaboration_id)

    return delete(ServiceConnectionRequest, service_connection_request_id)


@service_connection_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_service_connection():
    data = current_request.get_json()
    service = Service.query.get(int(data["service_id"]))
    collaboration = Collaboration.query.get(int(data["collaboration_id"]))

    confirm_collaboration_member(collaboration.id)

    user_id = current_user_id()
    is_admin = collaboration.is_admin(user_id)

    existing_request = ServiceConnectionRequest.query \
        .filter(ServiceConnectionRequest.collaboration_id == collaboration.id) \
        .filter(ServiceConnectionRequest.service_id == service.id) \
        .all()
    if existing_request:
        raise BadRequest(f"outstanding_service_connection_request: {service.name} and {collaboration.name}")

    user_uid = current_user_uid()
    service_connection_request = ServiceConnectionRequest(message=data.get("message"), hash=token_urlsafe(),
                                                          requester_id=current_user_id(), service_id=service.id,
                                                          collaboration_id=collaboration.id,
                                                          is_member_request=not is_admin,
                                                          created_by=user_uid, updated_by=user_uid)
    db.session.merge(service_connection_request)
    db.session.commit()

    _do_mail_request(collaboration, service, service_connection_request, is_admin)

    return {}, 201


@service_connection_request_api.route("/find_by_hash/<hash>", strict_slashes=False)
@json_endpoint
def service_connection_request_by_hash(hash):
    return _service_connection_request_by_hash(hash), 200


@service_connection_request_api.route("/approve/<hash>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_service_connection_request(hash):
    return _do_service_connection_request(hash, True)


@service_connection_request_api.route("/deny/<hash>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_service_connection_request(hash):
    return _do_service_connection_request(hash, False)


@service_connection_request_api.route("/resend/<service_connection_request_id>", strict_slashes=False)
@json_endpoint
def resend_service_connection_request(service_connection_request_id):
    service_connection_request = ServiceConnectionRequest.query\
        .filter(ServiceConnectionRequest.id == service_connection_request_id)\
        .one()
    if service_connection_request is None:
        raise Forbidden()
    service = service_connection_request.service
    collaboration = service_connection_request.collaboration

    confirm_collaboration_admin(collaboration.id)

    _do_mail_request(collaboration, service, service_connection_request, True)
    return {}, 200


@service_connection_request_api.route("/all/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def all_service_request_connections_by_service(service_id):
    confirm_write_access()
    return ServiceConnectionRequest.query \
               .join(ServiceConnectionRequest.collaboration) \
               .join(ServiceConnectionRequest.requester) \
               .options(contains_eager(ServiceConnectionRequest.collaboration)) \
               .options(contains_eager(ServiceConnectionRequest.requester)) \
               .filter(ServiceConnectionRequest.service_id == service_id) \
               .all(), 200
