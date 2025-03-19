from flask import Blueprint, request as current_request, current_app, g as request_context
from sqlalchemy.orm import contains_eager, load_only
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint, emit_socket
from server.api.collaborations_services import connect_service_collaboration
from server.auth.secrets import generate_token
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_write_access, \
    is_application_admin, is_organisation_admin, is_service_admin_or_manager, confirm_service_manager, \
    has_org_manager_unit_access
from server.db.activity import update_last_activity_date
from server.db.defaults import STATUS_DENIED, STATUS_APPROVED, STATUS_OPEN
from server.db.domain import ServiceConnectionRequest, Service, Collaboration, db, User
from server.db.models import delete
from server.mail import mail_service_connection_request, mail_accepted_declined_service_connection_request

service_connection_request_api = Blueprint("service_connection_request_api", __name__,
                                           url_prefix="/api/service_connection_requests")


def _service_connection_request_pending_organisation_approval(service_connection_request: ServiceConnectionRequest):
    service = service_connection_request.service
    collaboration = service_connection_request.collaboration
    user_id = current_user_id()

    if not has_org_manager_unit_access(user_id, collaboration, org_manager_allowed=True):
        raise Forbidden(f"Not allowed to approve / decline service_connection_request for service {service.entity_id}")

    service_connection_request.pending_organisation_approval = False
    db.session.merge(service_connection_request)
    user = db.session.get(User, user_id)
    _do_send_mail(collaboration, service, service_connection_request, user, False)

    emit_socket(f"service_{service.id}", include_current_user_id=True)
    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)
    emit_socket(f"organisation_{collaboration.organisation_id}", include_current_user_id=True)

    return {}, 201


def _do_send_mail(collaboration, service, service_connection_request, user, pending_organisation_approval):
    if pending_organisation_approval:
        recipients = [m.user.email for m in collaboration.organisation.organisation_memberships if m.role == "admin"]
    else:
        recipients = [service_membership.user.email for service_membership in service.service_memberships]
    if recipients:
        recipient = "Organisation admin" if pending_organisation_approval else "Service admin"
    else:
        admin = User.query.filter(User.uid == current_app.app_config.admin_users[0].uid).one()
        recipient = admin.name
        recipients.append(admin.email)
    context = {"salutation": f"Dear {recipient}",
               "base_url": current_app.app_config.base_url,
               "requester": user.name,
               "service_connection_request": service_connection_request,
               "service": service,
               "collaboration": collaboration,
               "organisation": collaboration.organisation,
               "user": user}
    mail_service_connection_request(context, service.name, collaboration.name, recipients,
                                    pending_organisation_approval)


def _do_service_connection_request(approved):
    json_data = current_request.get_json()
    service_connection_request_id = int(json_data.get("id"))
    service_connection_request = ServiceConnectionRequest.query \
        .filter(ServiceConnectionRequest.id == service_connection_request_id).one()

    pending_on_org = service_connection_request.pending_organisation_approval
    service = service_connection_request.service
    organisation = service_connection_request.collaboration.organisation
    allowed = service.automatic_connection_allowed or organisation in service.automatic_connection_allowed_organisations
    if not allowed and pending_on_org and approved:
        return _service_connection_request_pending_organisation_approval(service_connection_request)

    service = service_connection_request.service
    collaboration = service_connection_request.collaboration

    if not (is_service_admin_or_manager(service.id) or is_application_admin() or is_organisation_admin(
            organisation.id)):
        raise Forbidden(f"Not allowed to approve / decline service_connection_request for service {service.entity_id}")

    if approved:
        service_connection_request.status = STATUS_APPROVED
        db.session.merge(service_connection_request)

        connect_service_collaboration(service.id, collaboration.id, force=True)
    else:
        service_connection_request.status = STATUS_DENIED
        rejection_reason = json_data["rejection_reason"]
        service_connection_request.rejection_reason = rejection_reason
        db.session.merge(service_connection_request)

    user = User.query.filter(User.id == current_user_id()).one()
    requester = service_connection_request.requester
    context = {"salutation": f"Dear {requester.name},",
               "base_url": current_app.app_config.base_url,
               "service": service,
               "collaboration": collaboration,
               "contact": user.email,
               "user": requester}
    emails = [requester.email] if requester.email else [current_app.app_config.mail.beheer_email]
    mail_accepted_declined_service_connection_request(context, service.name, collaboration.name, approved,
                                                      emails)

    emit_socket(f"service_{service.id}", include_current_user_id=True)
    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)
    emit_socket(f"organisation_{collaboration.organisation_id}", include_current_user_id=True)

    return {}, 201


@service_connection_request_api.route("/by_service/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_request_connections_by_service(service_id):
    # Avoid security risk, only return id
    return ServiceConnectionRequest.query.options(load_only(ServiceConnectionRequest.collaboration_id)) \
        .filter(ServiceConnectionRequest.service_id == service_id) \
        .all(), 200


@service_connection_request_api.route("/<service_connection_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_request_connection(service_connection_request_id):
    service_connection_request = db.session.get(ServiceConnectionRequest, service_connection_request_id)
    service = service_connection_request.service

    # Also service admins are allowed to delete service_connection_requests
    try:
        confirm_collaboration_admin(service_connection_request.collaboration_id)
    except Forbidden:
        confirm_service_manager(service.id)

    emit_socket(f"service_{service.id}")
    emit_socket(f"collaboration_{service_connection_request.collaboration_id}", include_current_user_id=True)

    return delete(ServiceConnectionRequest, service_connection_request_id)


@service_connection_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_service_connection():
    data = current_request.get_json()
    service = db.session.get(Service, int(data["service_id"]))
    collaboration = db.session.get(Collaboration, int(data["collaboration_id"]))

    confirm_collaboration_admin(collaboration.id)

    user = db.session.get(User, current_user_id())
    request_new_service_connection(collaboration, data.get("message"), service, user)

    update_last_activity_date(collaboration.id)

    emit_socket(f"service_{service.id}")
    emit_socket(f"collaboration_{collaboration.id}")
    emit_socket(f"organisation_{collaboration.organisation_id}")

    return {}, 201


def request_new_service_connection(collaboration, message, service, user):
    existing_request = ServiceConnectionRequest.query \
        .filter(ServiceConnectionRequest.collaboration_id == collaboration.id) \
        .filter(ServiceConnectionRequest.service_id == service.id) \
        .filter(ServiceConnectionRequest.status == STATUS_OPEN) \
        .all()
    if existing_request:
        raise BadRequest(f"outstanding_service_connection_request: {service.name} and {collaboration.name}")
    pending_organisation_approval = collaboration.organisation.service_connection_requires_approval
    service_connection_request = ServiceConnectionRequest(message=message,
                                                          hash=generate_token(),
                                                          requester_id=user.id,
                                                          service_id=service.id,
                                                          pending_organisation_approval=pending_organisation_approval,
                                                          collaboration_id=collaboration.id,
                                                          created_by=user.uid,
                                                          updated_by=user.uid)
    db.session.merge(service_connection_request)
    db.session.commit()

    emit_socket(f"service_{service.id}")
    emit_socket(f"collaboration_{collaboration.id}")

    _do_send_mail(collaboration, service, service_connection_request, user, pending_organisation_approval)


@service_connection_request_api.route("/approve", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_service_connection_request():
    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True
    return _do_service_connection_request(True)


@service_connection_request_api.route("/deny", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_service_connection_request():
    return _do_service_connection_request(False)


@service_connection_request_api.route("/all/<service_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def all_service_request_connections_by_service(service_id):
    confirm_write_access(service_id, override_func=is_service_admin_or_manager)
    return ServiceConnectionRequest.query \
        .join(ServiceConnectionRequest.collaboration) \
        .join(ServiceConnectionRequest.requester) \
        .options(contains_eager(ServiceConnectionRequest.collaboration)) \
        .options(contains_eager(ServiceConnectionRequest.requester)) \
        .filter(ServiceConnectionRequest.service_id == service_id) \
        .all(), 200
