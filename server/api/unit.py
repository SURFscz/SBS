from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import confirm_organisation_admin
from server.db.domain import Unit

unit_api = Blueprint("api_unit", __name__, url_prefix="/api/units")


@unit_api.route("/usages/<organisation_id>/<unit_id>", strict_slashes=False)
@json_endpoint
def usages(organisation_id, unit_id):
    confirm_organisation_admin(organisation_id)
    unit = Unit.query.get(unit_id)
    return {
        "collaborations": [co.name for co in unit.collaborations],
        "invitations": [invite.organisation.name for invite in unit.organisation_invitations],
        "collaboration_requests": [co_req.name for co_req in unit.collaboration_requests],
    }, 200
