from flask import Blueprint

from server.api.base import json_endpoint
from server.api.exceptions import APIBadRequest
from server.auth.security import confirm_organisation_admin
from server.db.db import db
from server.db.domain import Unit, Organisation

unit_api = Blueprint("api_unit", __name__, url_prefix="/api/units")


def validate_units(data, organisation: Organisation):
    unit_attributes = ["id", "name", "organisation_id"]
    valid_units = []
    if "units" in data and data["units"]:
        units = data["units"]
        for unit in units:
            # Remove data that is used on the client
            for attr in list(unit.keys()):
                if attr not in unit_attributes:
                    del unit[attr]
            unit_hits = list(filter(lambda u: u.id == unit["id"], organisation.units))
            if not unit_hits or unit_hits[0].name != unit["name"]:
                raise APIBadRequest(f"Unit with name '{unit['name']}' is not a valid unit for "
                                    f"organisation '{organisation.name}'.")
            valid_units.append(unit_hits[0])
    return valid_units


@unit_api.route("/usages/<organisation_id>/<unit_id>", strict_slashes=False)
@json_endpoint
def usages(organisation_id, unit_id):
    confirm_organisation_admin(organisation_id)
    unit = db.session.get(Unit, unit_id)
    return {
        "collaborations": [co.name for co in unit.collaborations],
        "invitations": [invite.organisation.name for invite in unit.organisation_invitations],
        "organisation_memberships": [f"{m.user.name} - {m.organisation.name}" for m in unit.organisation_memberships],
        "api_keys": [api_key.description for api_key in unit.api_keys],
        "collaboration_requests": [co_req.name for co_req in unit.collaboration_requests],
    }, 200
