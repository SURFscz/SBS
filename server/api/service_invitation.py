from flask import Blueprint, request as current_request, current_app, jsonify
from sqlalchemy import func
from sqlalchemy.orm import joinedload, load_only
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint, query_param, emit_socket
from server.auth.security import confirm_service_admin, current_user_id
from server.db.defaults import default_expiry_date
from server.db.domain import ServiceInvitation, Service, ServiceMembership, db, User
from server.db.models import delete
from server.mail import mail_service_invitation
from server.tools import dt_now

service_invitations_api = Blueprint("service_invitations_api", __name__,
                                    url_prefix="/api/service_invitations")


def _service_invitation_query():
    return ServiceInvitation.query \
        .options(joinedload(ServiceInvitation.service, innerjoin=True)
                 .selectinload(Service.service_memberships)
                 .joinedload(ServiceMembership.user, innerjoin=True)) \
        .options(joinedload(ServiceInvitation.user, innerjoin=True))


def do_resend(service_invitation_id):
    service_invitation = _service_invitation_query() \
        .filter(ServiceInvitation.id == service_invitation_id) \
        .one()
    confirm_service_admin(service_invitation.service_id)
    service_invitation.expiry_date = default_expiry_date()
    service_invitation.created_at = dt_now()
    service_invitation = db.session.merge(service_invitation)
    mail_service_invitation({
        "salutation": "Dear",
        "invitation": service_invitation,
        "base_url": current_app.app_config.base_url,
        "intended_role": service_invitation.intended_role,
        "recipient": service_invitation.invitee_email
    }, service_invitation.service, [service_invitation.invitee_email], reminder=True)


@service_invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def service_invitations_by_hash():
    hash_value = query_param("hash")
    invitation_query = _service_invitation_query()
    service_invitation = invitation_query \
        .filter(ServiceInvitation.hash == hash_value) \
        .one()
    # To avoid conflict: Loader strategies for ORM Path[Mapper
    for member in service_invitation.service.service_memberships:
        member.user

    invitation_json = jsonify(service_invitation).json
    # Sanitize user information
    for sm in invitation_json["service"]["service_memberships"]:
        sm["user"] = User.sanitize_user(sm["user"])
    invitation_json["user"] = User.sanitize_user(invitation_json["user"])

    return invitation_json, 200


@service_invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def service_invitations_accept():
    service_invitation = _service_invitation_query() \
        .filter(ServiceInvitation.hash == current_request.get_json()["hash"]) \
        .one()

    if service_invitation.expiry_date and service_invitation.expiry_date < dt_now():
        delete(ServiceInvitation, service_invitation.id)
        raise Conflict(f"The invitation has expired at {service_invitation.expiry_date}")

    service = service_invitation.service
    user_id = current_user_id()
    if service.is_member(user_id):
        raise Conflict(f"User {user_id} is already a member of {service.name}")

    user_uid = service_invitation.user.uid
    service_membership = ServiceMembership(user_id=user_id,
                                           service_id=service.id,
                                           role=service_invitation.intended_role,
                                           created_by=user_uid,
                                           updated_by=user_uid)

    service.service_memberships.append(service_membership)
    service.service_invitations.remove(service_invitation)

    emit_socket(f"service_{service.id}", include_current_user_id=True)

    return None, 201


@service_invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def service_invitations_decline():
    service_invitation = _service_invitation_query() \
        .filter(ServiceInvitation.hash == current_request.get_json()["hash"]) \
        .one()

    emit_socket(f"service_{service_invitation.service_id}")

    db.session.delete(service_invitation)
    return None, 201


@service_invitations_api.route("/resend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def service_invitations_resend():
    data = current_request.get_json()
    service_invitation_id = data["id"]
    do_resend(service_invitation_id)
    return None, 201


@service_invitations_api.route("/resend_bulk", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend_bulk():
    data = current_request.get_json()
    for invitation in data:
        do_resend(invitation["id"])
    return None, 201


@service_invitations_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service_invitation(id):
    service_invitation = _service_invitation_query() \
        .filter(ServiceInvitation.id == id) \
        .one()
    confirm_service_admin(service_invitation.service_id)

    emit_socket(f"service_{service_invitation.service_id}")

    return delete(ServiceInvitation, id)


@service_invitations_api.route("/exists_email", methods=["POST"], strict_slashes=False)
@json_endpoint
def invitation_exists_by_email():
    data = current_request.get_json()
    service_id = int(data["service_id"])
    invitations = service_invitations_by_email(data["emails"], service_id)
    return [i.invitee_email for i in invitations], 200


def service_invitations_by_email(emails, service_id):
    invitations = ServiceInvitation.query.options(load_only(ServiceInvitation.invitee_email)) \
        .filter(func.lower(ServiceInvitation.invitee_email).in_([e.lower() for e in emails])) \
        .filter(ServiceInvitation.service_id == service_id) \
        .all()
    return invitations
