# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin
from server.db.domain import Group, CollaborationMembership
from server.db.db import db
from server.schemas import json_schema_validator

group_members_api = Blueprint("group_members_api", __name__,
                              url_prefix="/api/group_members")


def do_add_group_members(data, assert_collaboration_admin):
    group_id = data["group_id"]
    collaboration_id = data["collaboration_id"]
    if assert_collaboration_admin:
        confirm_collaboration_admin(collaboration_id)

    group = Group.query.get(group_id)
    members_ids = data["members_ids"]
    for members_id in members_ids:
        group.collaboration_memberships.append(CollaborationMembership.query.get(members_id))

    db.session.merge(group)
    return len(members_ids)


@group_members_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "group_members")
def add_group_members():
    data = current_request.get_json()
    count = do_add_group_members(data, True)

    res = data

    return (res, 201) if count > 0 else (None, 404)


@group_members_api.route("/delete_all_members/<group_id>/<collaboration_id>",
                         methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_group_members(group_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    group = Group.query.get(group_id)
    group.collaboration_memberships = []
    db.session.merge(group)

    group = Group.query.get(group_id)
    return group, 204


@group_members_api.route("/<group_id>/<collaboration_membership_id>/<collaboration_id>",
                         methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_group_members(group_id, collaboration_membership_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    group = Group.query.get(group_id)
    group.collaboration_memberships.remove(CollaborationMembership.query.get(collaboration_membership_id))
    db.session.merge(group)

    return group, 204
