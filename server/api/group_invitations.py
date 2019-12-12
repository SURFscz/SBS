# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.domain import Group, Invitation
from server.db.db import db

group_invitations_api = Blueprint("group_invitations_api", __name__,
                                  url_prefix="/api/group_invitations")


def do_add_group_invitations(data):
    group_id = data["group_id"]
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    group = Group.query.get(group_id)

    invitations_ids = data["invitations_ids"]
    for invitation_id in invitations_ids:
        group.invitations.append(Invitation.query.get(invitation_id))

    db.session.merge(group)
    return len(invitations_ids)


@group_invitations_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_group_invitations():
    data = current_request.get_json()
    do_add_group_invitations(data)

    return None, 201


@group_invitations_api.route("/<group_id>/<invitation_id>/<collaboration_id>",
                             methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_group_invitations(group_id, invitation_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    group = Group.query.get(group_id)
    group.invitations.remove(Invitation.query.get(invitation_id))
    return None, 204
