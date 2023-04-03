
from flask import Blueprint, request as current_request, current_app, g as request_context
from sqlalchemy.orm import contains_eager, load_only
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint, emit_socket
from server.api.collaborations_services import connect_service_collaboration
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_write_access, \
    confirm_collaboration_member, is_service_admin
from server.auth.secrets import generate_token
from server.db.domain import ServiceConnectionRequest, Service, Collaboration, db, User
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


def _service_connection_request_by_hash(hash_value):
    return _service_connection_request_query() \
        .filter(ServiceConnectionRequest.hash == hash_value) \
        .one()


def _do_service_connection_request(hash_value, approved):
    service_connection_request = _service_connection_request_by_hash(hash_value)
    service = service_connection_request.service
    collaboration = service_connection_request.collaboration

    if approved:
        connect_service_collaboration(service.id, collaboration.id, force=True)

    requester = service_connection_request.requester
    context = {"salutation": f"Dear {requester.name},",
               "base_url": current_app.app_config.base_url,
               "service": service,
               "collaboration": collaboration,
               "user": requester}
    emails = [requester.email] if requester.email else [current_app.app_config.mail.beheer_email]
    mail_accepted_declined_service_connection_request(context, service.name, collaboration.name, approved,
                                                      emails)
    db.session.delete(service_connection_request)

    emit_socket(f"service_{service.id}", include_current_user_id=True)
    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    return {}, 201


def _do_mail_request(collaboration, service, service_connection_request, is_admin, user):
    recipients = []
    cc = None
    if is_admin:
        recipients += [service_membership.user.email for service_membership in service.service_memberships]
        if recipients:
            cc = [service.contact_email] if service.contact_email else None
        elif service.contact_email:
            recipients.append(service.contact_email)
        else:
            recipients.append(User.query.filter(User.uid == current_app.app_config.admin_users[0].uid).one().email)
    else:
        for membership in collaboration.collaboration_memberships:
            if membership.role == "admin":
                recipients.append(membership.user.email)
    if len(recipients) > 0:
        context = {"salutation": f"Dear {service.contact_email}",
                   "base_url": current_app.app_config.base_url,
                   "requester": user.name,
                   "service_connection_request": service_connection_request,
                   "service": service,
                   "collaboration": collaboration,
                   "user": user}
        mail_service_connection_request(context, service.name, collaboration.name, recipients, is_admin, cc)


@service_connection_request_api.route("/by_service/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_request_connections_by_service(service_id):
    # Avoid security risk, only return id
    return ServiceConnectionRequest.query.options(load_only("collaboration_id")) \
                                         .filter(ServiceConnectionRequest.service_id == service_id) \
                                         .all(), 200


@service_connection_request_api.route("/<service_connection_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_request_connection(service_connection_request_id):
    service_connection_request = ServiceConnectionRequest.query.get(service_connection_request_id)

    confirm_collaboration_admin(service_connection_request.collaboration_id)

    service = service_connection_request.service

    emit_socket(f"service_{service.id}")
    emit_socket(f"collaboration_{service_connection_request.collaboration_id}", include_current_user_id=True)

    return delete(ServiceConnectionRequest, service_connection_request_id)


@service_connection_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_service_connection():
    data = current_request.get_json()
    service = Service.query.get(int(data["service_id"]))
    collaboration = Collaboration.query.get(int(data["collaboration_id"]))

    confirm_collaboration_member(collaboration.id)

    user = User.query.get(current_user_id())
    is_admin = collaboration.is_admin(user.id)

    request_new_service_connection(collaboration, data.get("message"), is_admin, service, user)

    return {}, 201


def request_new_service_connection(collaboration, message, is_admin, service, user):
    existing_request = ServiceConnectionRequest.query \
        .filter(ServiceConnectionRequest.collaboration_id == collaboration.id) \
        .filter(ServiceConnectionRequest.service_id == service.id) \
        .all()
    if existing_request:
        raise BadRequest(f"outstanding_service_connection_request: {service.name} and {collaboration.name}")
    service_connection_request = ServiceConnectionRequest(message=message,
                                                          hash=generate_token(),
                                                          requester_id=user.id,
                                                          service_id=service.id,
                                                          collaboration_id=collaboration.id,
                                                          is_member_request=not is_admin,
                                                          created_by=user.uid,
                                                          updated_by=user.uid)
    db.session.merge(service_connection_request)
    db.session.commit()

    emit_socket(f"service_{service.id}")
    emit_socket(f"collaboration_{collaboration.id}")

    _do_mail_request(collaboration, service, service_connection_request, is_admin, user)


@service_connection_request_api.route("/find_by_hash/<hash_value>", strict_slashes=False)
@json_endpoint
def service_connection_request_by_hash(hash_value):
    return _service_connection_request_by_hash(hash_value), 200


@service_connection_request_api.route("/approve/<hash_value>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_service_connection_request(hash_value):
    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True
    return _do_service_connection_request(hash_value, True)


@service_connection_request_api.route("/deny/<hash_value>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_service_connection_request(hash_value):
    return _do_service_connection_request(hash_value, False)


@service_connection_request_api.route("/resend/<service_connection_request_id>", strict_slashes=False)
@json_endpoint
def resend_service_connection_request(service_connection_request_id):
    service_connection_request = ServiceConnectionRequest.query.get(service_connection_request_id)
    service = service_connection_request.service
    collaboration = service_connection_request.collaboration

    confirm_collaboration_admin(collaboration.id)

    user = User.query.get(current_user_id())
    _do_mail_request(collaboration, service, service_connection_request, True, user)
    return {}, 200


@service_connection_request_api.route("/all/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def all_service_request_connections_by_service(service_id):
    confirm_write_access(service_id, override_func=is_service_admin)
    return ServiceConnectionRequest.query \
               .join(ServiceConnectionRequest.collaboration) \
               .join(ServiceConnectionRequest.requester) \
               .options(contains_eager(ServiceConnectionRequest.collaboration)) \
               .options(contains_eager(ServiceConnectionRequest.requester)) \
               .filter(ServiceConnectionRequest.service_id == service_id) \
               .all(), 200
