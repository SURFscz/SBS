# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request
from munch import munchify
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.db import db
from server.schemas import json_schema_validator

group_members_api = Blueprint("group_members_api", __name__,
                              url_prefix="/api/group_members")


def do_add_group_members(data, assert_collaboration_admin):
    group_id = data["group_id"]
    collaboration_id = data["collaboration_id"]
    if assert_collaboration_admin:
        confirm_collaboration_admin(collaboration_id)

    members_ids = data["members_ids"]
    if len(members_ids) == 0:
        return munchify({"rowcount": 1})
    values = ",".join(list(map(lambda id: f"({id},{group_id})", members_ids)))
    statement = f"INSERT INTO collaboration_memberships_groups " \
                f"(collaboration_membership_id, group_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    db.session.commit()
    return result_set


@group_members_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "group_members")
def add_group_members():
    data = current_request.get_json()
    result_set = do_add_group_members(data, True)

    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@group_members_api.route("/delete_all_members/<group_id>/<collaboration_id>",
                         methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_group_members(group_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE from collaboration_memberships_groups " \
                f"WHERE group_id = {group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@group_members_api.route("/<group_id>/<collaboration_membership_id>/<collaboration_id>",
                         methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_group_members(group_id, collaboration_membership_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM collaboration_memberships_groups " \
                f"WHERE collaboration_membership_id = {collaboration_membership_id}" \
                f" AND group_id = {group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
