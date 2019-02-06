from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.db import OrganisationMembership

organisation_membership_api = Blueprint("organisation_membership_api", __name__,
                                        url_prefix="/api/organisation_memberships")


@organisation_membership_api.route("/<organisation_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation_membership(organisation_id, user_id):
    confirm_write_access()
    row_count = OrganisationMembership.query \
        .filter(OrganisationMembership.organisation_id == organisation_id) \
        .filter(OrganisationMembership.user_id == user_id) \
        .delete()
    return (None, 204) if row_count > 0 else (None, 404)
