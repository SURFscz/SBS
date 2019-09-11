# -*- coding: future_fstrings -*-
import datetime

from flask import Blueprint, request as current_request, current_app
from sqlalchemy import text
from sqlalchemy.orm import joinedload, contains_eager
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint, query_param
from server.api.user_service_profile import create_user_service_profile
from server.auth.security import confirm_collaboration_admin, confirm_write_access, current_user_id, current_user
from server.db.db import Invitation, CollaborationMembership, Collaboration, db
from server.db.defaults import default_expiry_date
from server.db.models import delete
from server.mail import mail_collaboration_invitation

invitations_api = Blueprint("invitations_api", __name__,
                            url_prefix="/api/invitations")


def _invitation_query():
    return Invitation.query \
        .outerjoin(Invitation.authorisation_groups) \
        .options(joinedload(Invitation.collaboration)
                 .subqueryload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user)) \
        .options(joinedload(Invitation.user)) \
        .options(contains_eager(Invitation.authorisation_groups)) \



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


def add_authorisation_group_membership(authorisation_groups, collaboration_membership):
    if len(authorisation_groups) > 0:
        values = ",".join(list(map(lambda ag: f"({collaboration_membership.id},{ag.id})", authorisation_groups)))
        statement = f"INSERT INTO collaboration_memberships_authorisation_groups " \
            f"(collaboration_membership_id, authorisation_group_id) VALUES {values}"

        db.engine.execute(text(statement))
        # We need the relationship of
        db.session.commit()

    for authorisation_group in authorisation_groups:
        # Create an UserServiceProfile for each Service linked to the AuthorisationGroup
        create_user_service_profile([s.id for s in authorisation_group.services], authorisation_group, current_user(),
                                    collaboration_membership.user_id)


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
                                                       collaboration=collaboration,
                                                       role=role,
                                                       created_by=invitation.user.uid,
                                                       updated_by=invitation.user.uid)

    collaboration.collaboration_memberships.append(collaboration_membership)
    collaboration.invitations.remove(invitation)

    # We need the persistent identifier of the collaboration_membership
    db.session.commit()

    # ensure all authorisation group membership are added
    authorisation_groups = invitation.authorisation_groups + list(
        filter(lambda ag: ag.auto_provision_members, collaboration.authorisation_groups))
    unique_authorisation_groups = list({ag.id: ag for ag in authorisation_groups}.values())

    add_authorisation_group_membership(unique_authorisation_groups, collaboration_membership)

    return None, 201


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
        "expiry_days": (invitation.expiry_date - datetime.datetime.today()).days
    }, invitation.collaboration, [invitation.invitee_email])
    return None, 201


@invitations_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_invitation(id):
    confirm_write_access()
    return delete(Invitation, id)
