# -*- coding: future_fstrings -*-
import datetime

from flask import Blueprint, request as current_request, current_app
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Conflict

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_organisation_admin, current_user_id
from server.db.defaults import default_expiry_date
from server.db.domain import OrganisationInvitation, Organisation, OrganisationMembership, db
from server.db.models import delete
from server.mail import mail_organisation_invitation

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
    hash_value = query_param("hash")
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == hash_value) \
        .one()
    return organisation_invitation, 200


@organisation_invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invitations_accept():
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == current_request.get_json()["hash"]) \
        .one()

    if organisation_invitation.expiry_date and organisation_invitation.expiry_date < datetime.datetime.now():
        delete(OrganisationInvitation, organisation_invitation.id)
        raise Conflict(f"The invitation has expired at {organisation_invitation.expiry_date}")

    organisation = organisation_invitation.organisation
    user_id = current_user_id()
    if organisation.is_member(user_id):
        raise Conflict(f"User {user_id} is already a member of {organisation.name}")

    user_uid = organisation_invitation.user.uid
    organisation_membership = OrganisationMembership(user_id=user_id,
                                                     organisation_id=organisation.id,
                                                     role=organisation_invitation.intended_role,
                                                     created_by=user_uid,
                                                     updated_by=user_uid)

    organisation.organisation_memberships.append(organisation_membership)
    organisation.organisation_invitations.remove(organisation_invitation)
    return None, 201


@organisation_invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invitations_decline():
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.hash == current_request.get_json()["hash"]) \
        .one()
    db.session.delete(organisation_invitation)
    return None, 201


@organisation_invitations_api.route("/resend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invitations_resend():
    data = current_request.get_json()

    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.id == data["id"]) \
        .one()
    confirm_organisation_admin(organisation_invitation.organisation_id)

    organisation_invitation.expiry_date = default_expiry_date()
    organisation_invitation.created_at = datetime.date.today(),
    if "message" in data:
        organisation_invitation.message = data["message"]

    organisation_invitation = db.session.merge(organisation_invitation)

    mail_organisation_invitation({
        "salutation": "Dear",
        "invitation": organisation_invitation,
        "base_url": current_app.app_config.base_url,
        "recipient": organisation_invitation.invitee_email
    }, organisation_invitation.organisation, [organisation_invitation.invitee_email])
    return None, 201


@organisation_invitations_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation_invitation(id):
    organisation_invitation = _organisation_invitation_query() \
        .filter(OrganisationInvitation.id == id) \
        .one()
    confirm_organisation_admin(organisation_invitation.organisation_id)

    return delete(OrganisationInvitation, id)
