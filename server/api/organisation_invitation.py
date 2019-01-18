from flask import Blueprint, request as current_request
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.db.db import OrganisationInvitation, Organisation, OrganisationMembership

organisation_invitations_api = Blueprint("organisation_invitations_api", __name__,
                                         url_prefix="/api/organisation_invitations")


@organisation_invitations_api.route("/find_by_hash", strict_slashes=False)
@json_endpoint
def organisation_invitations_by_hash():
    hash_value = current_request.args.get("hash")
    organisation_invitation = OrganisationInvitation.query \
        .options(joinedload(OrganisationInvitation.organisation)
                 .subqueryload(Organisation.organisation_memberships).subqueryload(OrganisationMembership.user)) \
        .filter(OrganisationInvitation.hash == hash_value) \
        .one()
    return organisation_invitation, 200


@organisation_invitations_api.route("/accept", methods=["POST"], strict_slashes=False)
@json_endpoint
def organisation_invitations_accept():
    return None, 200


@organisation_invitations_api.route("/decline", methods=["POST"], strict_slashes=False)
@json_endpoint
def organisation_invitations_decline():
    return None, 200
