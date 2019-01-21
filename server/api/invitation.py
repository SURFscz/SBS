from flask import Blueprint, request as current_request, session
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint
from server.api.security import confirm_collaboration_admin
from server.db.db import Invitation, CollaborationMembership, Collaboration, db

invitations_api = Blueprint("invitations_api", __name__,
                            url_prefix="/api/invitations")


def _invitation_query():
    return Invitation.query \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user)) \
        .options(joinedload(Invitation.user))


@invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def invitations_by_hash():
    hash_value = current_request.args.get("hash")
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
    collaboration = invitation.collaboration
    user_id = session["user"]["id"]
    if collaboration.is_member(user_id):
        raise Conflict(f"User {user_id} is already a member of {collaboration.name}")
    role = invitation.intended_role if invitation.intended_role else "member"
    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration=collaboration,
                                                       role=role,
                                                       created_by=invitation.user.uid)

    collaboration.collaboration_memberships.append(collaboration_membership)
    collaboration.invitations.remove(invitation)
    db.session.commit()
    return None, 201


@invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_decline():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    db.session.delete(invitation)
    db.session.commit()
    return None, 201
