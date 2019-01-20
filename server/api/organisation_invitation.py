from flask import Blueprint, request as current_request, session
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint
from server.api.security import confirm_organization_admin
from server.db.db import OrganisationInvitation, Organisation, OrganisationMembership, db

organisation_invitations_api = Blueprint("organisation_invitations_api", __name__,
                                         url_prefix="/api/organisation_invitations")


def _organisation_invitation_query():
    return OrganisationInvitation.query \
        .options(joinedload(OrganisationInvitation.organisation)
                 .subqueryload(Organisation.organisation_memberships)
                 .subqueryload(OrganisationMembership.user)) \
        .options(joinedload(OrganisationInvitation.user))


@organisation_invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def organisation_invitations_by_hash():
    hash_value = current_request.args.get("hash")
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == hash_value) \
        .one()
    return organisation_invitation, 200


@organisation_invitations_api.route("/<id>", strict_slashes=False)
@json_endpoint
def organisation_invitations_by_id(id):
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.id == id) \
        .one()

    confirm_organization_admin(organisation_invitation.organisation.id)
    return organisation_invitation, 200


@organisation_invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invitations_accept():
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == current_request.get_json()["hash"]) \
        .one()
    organisation = organisation_invitation.organisation
    user_id = session["user"]["id"]
    if organisation.is_member(user_id):
        raise Conflict(f"User {user_id} is already a member of {organisation.name}")

    organisation_membership = OrganisationMembership(user_id=user_id,
                                                     organisation=organisation,
                                                     role="admin", created_by=organisation_invitation.user.uid)

    organisation.organisation_memberships.append(organisation_membership)
    organisation.organisation_invitations.remove(organisation_invitation)
    db.session.commit()
    return None, 201


@organisation_invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invitations_decline():
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == current_request.get_json()["hash"]) \
        .one()
    db.session.delete(organisation_invitation)
    db.session.commit()
    return None, 201
