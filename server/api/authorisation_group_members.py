from flask import Blueprint, request as current_request
from sqlalchemy import text

from server.api.base import json_endpoint
from server.api.security import confirm_collaboration_admin
from server.db.db import db

authorisation_group_members_api = Blueprint("authorisation_group_members_api", __name__,
                                            url_prefix="/api/authorisation_group_members")


@authorisation_group_members_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_authorisation_group_members():
    data = current_request.get_json()
    authorisation_group_id = data["authorisation_group_id"]
    collaboration_id = data["collaboration_id"]

    confirm_collaboration_admin(collaboration_id)

    members_ids = data["members_ids"]
    values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", members_ids)))
    statement = f"INSERT into collaboration_memberships_authorisation_groups " \
        f"(collaboration_membership_id, authorisation_group_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_members_api.route("/delete_all_members/<authorisation_group_id>/<collaboration_id>",
                                       methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_authorisation_group_members(authorisation_group_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from collaboration_memberships_authorisation_groups " \
        f"WHERE authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_members_api.route("/<authorisation_group_id>/<collaboration_membership_id>/<collaboration_id>",
                                       methods=["DELETE"],
                                       strict_slashes=False)
@json_endpoint
def delete_authorisation_group_members(authorisation_group_id, collaboration_membership_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from collaboration_memberships_authorisation_groups " \
        f"WHERE collaboration_membership_id = {collaboration_membership_id}" \
        f" AND authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
