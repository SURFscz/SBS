# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request
from munch import munchify
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.db import db

authorisation_group_invitations_api = Blueprint("authorisation_group_invitations_api", __name__,
                                                url_prefix="/api/authorisation_group_invitations")


def do_add_authorisation_group_invitations(data):
    authorisation_group_id = data["authorisation_group_id"]
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)
    invitations_ids = data["invitations_ids"]
    if len(invitations_ids) == 0:
        return munchify({"rowcount": 1})
    values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", invitations_ids)))
    statement = f"INSERT INTO authorisation_groups_invitations " \
        f"(invitation_id, authorisation_group_id) VALUES {values}"
    sql = text(statement)
    return db.engine.execute(sql)


@authorisation_group_invitations_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_authorisation_group_invitations():
    data = current_request.get_json()
    result_set = do_add_authorisation_group_invitations(data)

    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_invitations_api.route("/<authorisation_group_id>/<invitation_id>/<collaboration_id>",
                                           methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_authorisation_group_invitations(authorisation_group_id, invitation_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM authorisation_groups_invitations " \
        f"WHERE authorisation_group_id = {int(authorisation_group_id)}" \
        f" AND invitation_id = {int(invitation_id)}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
