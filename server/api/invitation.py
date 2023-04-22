import datetime
import re
import uuid

from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, g as request_context, jsonify
from sqlalchemy.orm import joinedload, selectinload
from werkzeug.exceptions import Conflict, Forbidden

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.service_aups import add_user_aups
from server.auth.secrets import generate_token
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_external_api_call
from server.db.defaults import default_expiry_date
from server.db.domain import Invitation, CollaborationMembership, Collaboration, db, User, Organisation, JoinRequest
from server.db.models import delete
from server.mail import mail_collaboration_invitation
from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed

invitations_api = Blueprint("invitations_api", __name__, url_prefix="/api/invitations")

email_re = re.compile("^\\S+@\\S+$")


def _invitation_query():
    return Invitation.query \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user)) \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.organisation)) \
        .options(joinedload(Invitation.user)) \
        .options(joinedload(Invitation.groups))


def do_resend(invitation_id):
    invitation = _invitation_query() \
        .filter(Invitation.id == invitation_id) \
        .one()
    confirm_collaboration_admin(invitation.collaboration_id)
    invitation.expiry_date = default_expiry_date()
    invitation.created_at = datetime.date.today(),
    db.session.merge(invitation)
    mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link,
        "recipient": invitation.invitee_email
    }, invitation.collaboration, [invitation.invitee_email])


def parse_date(val, default_date=None):
    return datetime.datetime.fromtimestamp(val / 1e3) if val and (
        isinstance(val, float) or isinstance(val, int)) else default_date


@invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def invitations_by_hash():
    hash_value = query_param("hash")
    invitation_query = _invitation_query()
    invitation = invitation_query \
        .options(selectinload(Invitation.groups)) \
        .options(selectinload(Invitation.collaboration).selectinload(Collaboration.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Invitation.collaboration).selectinload(Collaboration.groups)) \
        .options(selectinload(Invitation.collaboration).selectinload(Collaboration.services)) \
        .options(selectinload(Invitation.collaboration).selectinload(Collaboration.organisation)
                 .selectinload(Organisation.services)) \
        .filter(Invitation.hash == hash_value) \
        .one()
    if not query_param("expand", required=False):
        return invitation, 200

    invitation_json = jsonify(invitation).json
    service_emails = invitation.collaboration.service_emails()
    return {"invitation": invitation_json, "service_emails": service_emails}, 200


@invitations_api.route("/v1/collaboration_invites", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/put_new_invitations.yml")
@json_endpoint
def collaboration_invites_api():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation

    data = current_request.get_json()
    coll_short_name = data["short_name"]

    collaborations = list(filter(lambda coll: coll.short_name == coll_short_name, organisation.collaborations))
    if not collaborations:
        raise Forbidden(f"Collaboration {coll_short_name} is not part of organisation {organisation.name}")

    collaboration = collaborations[0]
    collaboration_admins = list(filter(lambda cm: cm.role == "admin", collaboration.collaboration_memberships))

    if len(collaboration_admins) > 0:
        user = collaboration_admins[0].user
    elif len(organisation.organisation_memberships) > 0:
        user = organisation.organisation_memberships[0].user
    else:
        user = User.query.filter(User.uid == current_app.app_config.admin_users[0].uid).one()

    message = data.get("message")
    intended_role = data.get("intended_role", "member")
    intended_role = "member" if intended_role not in ["admin", "member"] else intended_role

    expiry_date = parse_date(data.get("invitation_expiry_date"), default_expiry_date())
    membership_expiry_date = parse_date(data.get("membership_expiry_date"))
    invites = list(filter(lambda recipient: bool(email_re.match(recipient)), data["invites"]))
    invites_results = []
    for email in invites:
        invitation = Invitation(hash=generate_token(), message=message, invitee_email=email,
                                collaboration_id=collaboration.id, user=user, intended_role=intended_role,
                                expiry_date=expiry_date, membership_expiry_date=membership_expiry_date,
                                created_by="system", external_identifier=str(uuid.uuid4()), status="open")
        invitation = db.session.merge(invitation)
        invites_results.append({
            "email": email,
            "invitation_expiry_date": expiry_date,
            "status": "open",
            "invitation_id": invitation.external_identifier

        })
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": email
        }, collaboration, [email])

    emit_socket(f"collaboration_{collaboration.id}")

    return invites_results, 201


@invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_accept():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    if invitation.status != "open":
        raise Conflict(f"The invitation has status {invitation.status}")

    if invitation.expiry_date and invitation.expiry_date < datetime.datetime.now():
        if invitation.external_identifier:
            invitation.status = "expired"
            db.session.merge(invitation)
            db.session.commit()
        else:
            delete(Invitation, invitation.id)
        raise Conflict(f"The invitation has expired at {invitation.expiry_date}")

    collaboration = invitation.collaboration
    user_id = current_user_id()
    if collaboration.is_member(user_id):
        delete(Invitation, invitation.id)
        raise Conflict(f"User {user_id} is already a member of {collaboration.name}")

    role = invitation.intended_role if invitation.intended_role else "member"
    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration_id=collaboration.id,
                                                       role=role,
                                                       expiry_date=invitation.membership_expiry_date,
                                                       created_by=invitation.user.uid,
                                                       updated_by=invitation.user.uid)
    if invitation.external_identifier:
        collaboration_membership.invitation_id = invitation.id

    collaboration_membership = db.session.merge(collaboration_membership)

    # ensure all authorisation group membership are added
    groups = invitation.groups + list(filter(lambda ag: ag.auto_provision_members, collaboration.groups))

    unique_groups = list(set({ag.id: ag for ag in groups}.values()))
    for group in unique_groups:
        group.collaboration_memberships.append(collaboration_membership)
        db.session.merge(group)

    db.session.commit()

    add_user_aups(collaboration, user_id)

    # Any outstanding join request for this user and this collaboration can be deleted now
    JoinRequest.query.filter(JoinRequest.user_id == user_id, JoinRequest.collaboration_id == collaboration.id).delete()

    res = {'collaboration_id': collaboration.id, 'user_id': user_id}

    # Need to reload to prevent sqlalchemy.orm.exc.DetachedInstanceError
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    collaboration_id = invitation.collaboration.id
    # We need the persistent identifier of the collaboration_membership which will be generated after the delete-commit
    if invitation.external_identifier:
        invitation.status = "accepted"
        db.session.merge(invitation)
    else:
        delete(Invitation, invitation.id)

    emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)
    broadcast_collaboration_changed(collaboration_id)

    return res, 201


@invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_decline():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()

    collaboration = invitation.collaboration

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    db.session.delete(invitation)
    return None, 201


@invitations_api.route("/resend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend():
    data = current_request.get_json()
    do_resend(data["id"])
    return None, 201


@invitations_api.route("/resend_bulk", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend_bulk():
    data = current_request.get_json()
    for invitation in data:
        do_resend(invitation["id"])
    return None, 201


@invitations_api.route("/<invitation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_invitation(invitation_id):
    invitation = Invitation.query.filter(Invitation.id == invitation_id).one()
    collaboration = invitation.collaboration
    confirm_collaboration_admin(collaboration.id)

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    return delete(Invitation, invitation_id)


@invitations_api.route("/v1/<external_identifier>", strict_slashes=False)
@swag_from("../swagger/public/paths/get_invitation_by_identifier.yml")
@json_endpoint
def external_invitation(external_identifier):
    confirm_external_api_call()
    invitation = Invitation.query.filter(Invitation.external_identifier == external_identifier).one()
    res = {
        "status": invitation.status,
        "invitation": {
            "identifier": invitation.external_identifier,
            "email": invitation.invitee_email
        }
    }
    if invitation.status == "accepted":
        cm = CollaborationMembership.query.filter(CollaborationMembership.invitation_id == invitation.id).one()
        res["user"] = {
            "name": cm.user.name,
            "mail": cm.user.email,
            "username": cm.user.username,
            "platform_id": cm.user.uid,
            "status": "suspended" if cm.user.suspended else "active"
        }
    else:
        res["invitation"]["expiry_date"] = invitation.expiry_date
    return res, 200
