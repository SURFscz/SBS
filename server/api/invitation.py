# -*- coding: future_fstrings -*-
import datetime

from flask import Blueprint, request as current_request, current_app
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_collaboration_admin, current_user_id
from server.db.defaults import default_expiry_date
from server.db.domain import Invitation, CollaborationMembership, Collaboration, db
from server.db.models import delete
from server.mail import mail_collaboration_invitation

invitations_api = Blueprint("invitations_api", __name__,
                            url_prefix="/api/invitations")


def _invitation_query():
    return Invitation.query \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user)) \
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


@invitations_api.route("/<id>", strict_slashes=False)
@json_endpoint
def invitations_by_id(id):
    invitation = _invitation_query() \
        .filter(Invitation.id == id) \
        .one()

    confirm_collaboration_admin(invitation.collaboration.id)
    return invitation, 200


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
    db.session.merge(invitation)

    mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link
    }, invitation.collaboration, [invitation.invitee_email])
    return None, 201


@invitations_api.route("/<invitation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_invitation(invitation_id):
    invitation = Invitation.query.get(invitation_id)
    confirm_collaboration_admin(invitation.collaboration_id)
    return delete(Invitation, invitation_id)
