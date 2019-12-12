# -*- coding: future_fstrings -*-
from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import confirm_organisation_admin
from server.db.db import db
from server.db.domain import OrganisationMembership

organisation_membership_api = Blueprint("organisation_membership_api", __name__,
                                        url_prefix="/api/organisation_memberships")


@organisation_membership_api.route("/<organisation_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation_membership(organisation_id, user_id):
    confirm_organisation_admin(organisation_id)
    memberships = OrganisationMembership.query \
        .filter(OrganisationMembership.organisation_id == organisation_id) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    for membership in memberships:
        db.session.delete(membership)
    return (None, 204) if len(memberships) > 0 else (None, 404)
