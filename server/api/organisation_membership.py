from flask import Blueprint, request as current_request

from server.api.base import json_endpoint, emit_socket
from server.api.unit import validate_units
from server.auth.security import confirm_organisation_admin, current_user_id
from server.db.db import db
from server.db.domain import OrganisationMembership

organisation_membership_api = Blueprint("organisation_membership_api", __name__,
                                        url_prefix="/api/organisation_memberships")


@organisation_membership_api.route("/<organisation_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation_membership(organisation_id, user_id):
    if current_user_id() != int(user_id):
        confirm_organisation_admin(organisation_id)

    memberships = OrganisationMembership.query \
        .filter(OrganisationMembership.organisation_id == organisation_id) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    for membership in memberships:
        db.session.delete(membership)

    emit_socket(f"organisation_{organisation_id}", include_current_user_id=True)

    return (None, 204) if len(memberships) > 0 else (None, 404)


@organisation_membership_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_organisation_membership_role():
    client_data = current_request.get_json()
    organisation_id = client_data["organisationId"]
    user_id = client_data["userId"]
    role = client_data["role"]
    units = client_data.get("units")

    confirm_organisation_admin(organisation_id)

    organisation_membership = OrganisationMembership.query \
        .filter(OrganisationMembership.organisation_id == organisation_id) \
        .filter(OrganisationMembership.user_id == user_id) \
        .one()
    organisation_membership.role = role
    if units is not None and role == "manager":
        organisation_membership.units = validate_units(client_data, organisation_membership.organisation)
    if organisation_membership.units and role == "admin":
        organisation_membership.units.clear()

    emit_socket(f"organisation_{organisation_id}", include_current_user_id=True)

    db.session.merge(organisation_membership)
    return organisation_membership, 201
