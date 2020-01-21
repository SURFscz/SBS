# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from sqlalchemy import func
from sqlalchemy.orm import load_only, contains_eager
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param
from server.api.group_invitations import do_add_group_invitations
from server.api.group_members import do_add_group_members
from server.auth.security import confirm_collaboration_admin, \
    confirm_collaboration_admin_or_group_member, current_user_id, confirm_group_member
from server.db.domain import Group, CollaborationMembership, Collaboration
from server.db.defaults import cleanse_short_name
from server.db.models import update, save, delete
from server.schemas import json_schema_validator

group_api = Blueprint("group_api", __name__, url_prefix="/api/groups")


def auto_provision_all_members_and_invites(group: Group):
    if not group.auto_provision_members:
        return
    ag_member_identifiers = [m.id for m in group.collaboration_memberships]
    c_member_identifiers = [m.id for m in group.collaboration.collaboration_memberships]
    missing_members = list(filter(lambda m: m not in ag_member_identifiers, c_member_identifiers))
    do_add_group_members({
        "group_id": group.id,
        "collaboration_id": group.collaboration_id,
        "members_ids": missing_members
    }, True)

    ag_invitation_identifiers = [i.id for i in group.invitations]
    c_invitation_identifiers = [i.id for i in group.collaboration.invitations]
    missing_invitations = list(filter(lambda i: i not in ag_invitation_identifiers, c_invitation_identifiers))
    do_add_group_invitations({
        "group_id": group.id,
        "collaboration_id": group.collaboration_id,
        "invitations_ids": missing_invitations
    })


@group_api.route("/", strict_slashes=False)
@json_endpoint
def my_groups():
    user_id = current_user_id()

    groups = Group.query \
        .join(Group.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .options(contains_eager(Group.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return groups, 200


@group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    collaboration_id = query_param("collaboration_id")
    existing_group = query_param("existing_group", required=False, default="")
    group = Group.query.options(load_only("id")) \
        .filter(func.lower(Group.name) == func.lower(name)) \
        .filter(func.lower(Group.name) != func.lower(existing_group)) \
        .filter(Group.collaboration_id == collaboration_id) \
        .first()
    return group is not None, 200


@group_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def short_name_exists():
    short_name = query_param("short_name")
    collaboration_id = query_param("collaboration_id")
    existing_group = query_param("existing_group", required=False, default="")
    group = Group.query.options(load_only("id")) \
        .filter(func.lower(Group.short_name) == func.lower(short_name)) \
        .filter(func.lower(Group.short_name) != func.lower(existing_group)) \
        .filter(Group.collaboration_id == collaboration_id) \
        .first()
    return group is not None, 200


@group_api.route("/all/<collaboration_id>", strict_slashes=False)
@json_endpoint
def groups_by_collaboration(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    groups = Group.query \
        .join(Group.collaboration) \
        .filter(Group.collaboration_id == collaboration_id) \
        .all()
    return groups, 200


@group_api.route("/access_allowed/<group_id>/<collaboration_id>", strict_slashes=False)
@json_endpoint
def group_access_allowed(group_id, collaboration_id):
    try:
        confirm_collaboration_admin(collaboration_id)
        return {"access": "full"}, 200
    except Forbidden:
        if confirm_group_member(group_id):
            return {"access": "lite"}, 200
        raise Forbidden()


@group_api.route("/<group_id>/<collaboration_id>", strict_slashes=False)
@json_endpoint
def group_by_id(group_id, collaboration_id):
    confirm_collaboration_admin_or_group_member(collaboration_id, group_id)

    group = Group.query \
        .join(Group.collaboration) \
        .outerjoin(Group.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user) \
        .outerjoin(Group.invitations) \
        .options(contains_eager(Group.collaboration)) \
        .options(contains_eager(Group.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .options(contains_eager(Group.invitations)) \
        .filter(Group.id == group_id) \
        .filter(Group.collaboration_id == collaboration_id) \
        .one()
    for member in group.collaboration.collaboration_memberships:
        member.user
    return group, 200


@group_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "groups")
def save_group():
    data = current_request.get_json()

    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    _assign_global_urn(collaboration_id, data)
    cleanse_short_name(data)

    res = save(Group, custom_json=data, allow_child_cascades=False)

    auto_provision_all_members_and_invites(res[0])

    return res


def _assign_global_urn(collaboration_id, data):
    collaboration = Collaboration.query \
        .join(Collaboration.organisation) \
        .options(contains_eager(Collaboration.organisation)) \
        .filter(Collaboration.id == collaboration_id).one()
    data["global_urn"] = f"{collaboration.organisation.short_name}:{collaboration.short_name}:{data['short_name']}"


@group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_group():
    data = current_request.get_json()

    collaboration_id = int(data["collaboration_id"])
    confirm_collaboration_admin(collaboration_id)

    _assign_global_urn(collaboration_id, data)
    cleanse_short_name(data)

    res = update(Group, custom_json=data, allow_child_cascades=False)

    auto_provision_all_members_and_invites(res[0])

    return res


@group_api.route("/<group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_group(group_id):
    group = Group.query.filter(Group.id == group_id).one()

    confirm_collaboration_admin(group.collaboration_id)
    return delete(Group, group_id)
