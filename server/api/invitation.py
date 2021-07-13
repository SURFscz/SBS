# -*- coding: future_fstrings -*-
import datetime
import re
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app, g as request_context
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Conflict, Forbidden

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_external_api_call
from server.db.defaults import default_expiry_date
from server.db.domain import Invitation, CollaborationMembership, Collaboration, db, User
from server.db.models import delete
from server.mail import mail_collaboration_invitation

invitations_api = Blueprint("invitations_api", __name__, url_prefix="/api/invitations")

email_re = re.compile("^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:.[a-zA-Z0-9-]+)*$")


def _invitation_query():
    return Invitation.query \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user)) \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.organisation)) \
        .options(joinedload(Invitation.user)) \
        .options(joinedload(Invitation.groups))


@invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def invitations_by_hash():
    hash_value = query_param("hash")
    invitation = _invitation_query() \
        .filter(Invitation.hash == hash_value) \
        .one()
    return invitation, 200


@invitations_api.route("/v1/collaboration_invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def collaboration_invites_api():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation

    data = current_request.get_json()
    collaboration_id = int(data["collaboration_id"])

    if not any(coll.id == collaboration_id for coll in organisation.collaborations):
        raise Forbidden(f"API error: collaboration {collaboration_id} is not part of organisation {organisation.name}")

    collaboration = Collaboration.query.get(collaboration_id)

    collaboration_admins = list(filter(lambda cm: cm.role == "admin", collaboration.collaboration_memberships))
    if len(collaboration_admins) > 0:
        user = collaboration_admins[0].user
    elif len(organisation.organisation_memberships) > 0:
        user = organisation.organisation_memberships[0].user
    else:
        user = User.query.filter(User.uid == current_app.app_config.admin_users[0].uid).one()

    message = data.get("message")
    invites = list(filter(lambda recipient: bool(email_re.match(recipient)), data["invites"]))

    for email in invites:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=email,
                                collaboration_id=collaboration.id, user=user, intended_role="member",
                                expiry_date=default_expiry_date(), created_by="system")
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": email
        }, collaboration, [email])

    return invites, 201


@invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_accept():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()

    if invitation.expiry_date and invitation.expiry_date < datetime.datetime.now():
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
    collaboration_membership = db.session.merge(collaboration_membership)
    # We need the persistent identifier of the collaboration_membership which will be generated after the delete-commit
    delete(Invitation, invitation.id)

    # ensure all authorisation group membership are added
    groups = invitation.groups + list(filter(lambda ag: ag.auto_provision_members, collaboration.groups))

    for group in set(list({ag.id: ag for ag in groups}.values())):
        group.collaboration_memberships.append(collaboration_membership)
        db.session.merge(group)

    res = {'collaboration_id': collaboration.id, 'user_id': user_id}
    return res, 201


@invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_decline():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    db.session.delete(invitation)
    return None, 201


@invitations_api.route("/resend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend():
    data = current_request.get_json()
    invitation = _invitation_query() \
        .filter(Invitation.id == data["id"]) \
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
    return None, 201


@invitations_api.route("/<invitation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_invitation(invitation_id):
    invitation = Invitation.query.filter(Invitation.id == invitation_id).one()
    confirm_collaboration_admin(invitation.collaboration_id)
    return delete(Invitation, invitation_id)
