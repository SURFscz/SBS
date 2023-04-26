import uuid

from flasgger import swag_from
from flask import Blueprint, request as current_request, g as request_context
from sqlalchemy import func
from sqlalchemy.orm import load_only
from werkzeug.exceptions import Forbidden, Conflict

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.group_members import do_add_group_members
from server.auth.security import confirm_collaboration_admin, confirm_external_api_call
from server.db.db import db
from server.db.defaults import cleanse_short_name
from server.db.domain import Group, Collaboration, Invitation, User, CollaborationMembership
from server.db.models import update, save, delete
from server.schemas import json_schema_validator
from server.scim.events import broadcast_group_deleted, broadcast_group_changed

group_api = Blueprint("group_api", __name__, url_prefix="/api/groups")


def do_add_group_invitations(data):
    group_id = data["group_id"]
    collaboration_id = data["collaboration_id"]
    if "skip_collaboration_admin_confirmation" not in request_context:
        confirm_collaboration_admin(collaboration_id)

    group = db.session.get(Group, group_id)

    invitations_ids = data["invitations_ids"]
    for invitation_id in invitations_ids:
        group.invitations.append(db.session.get(Invitation, invitation_id))

    db.session.merge(group)
    return len(invitations_ids)


def auto_provision_all_members_and_invites(group: Group):
    if group.auto_provision_members:
        ag_member_identifiers = [m.id for m in group.collaboration_memberships]
        c_member_identifiers = [m.id for m in group.collaboration.collaboration_memberships]
        missing_members = list(filter(lambda m: m not in ag_member_identifiers, c_member_identifiers))
        do_add_group_members({
            "group_id": group.id,
            "collaboration_id": group.collaboration_id,
            "members_ids": missing_members
        }, True)
        # Session is closed in do_add_group_members, but we are not ready yet, so re-fetch the Group
        group = db.session.get(Group, group.id)

        ag_invitation_identifiers = [i.id for i in group.invitations]
        c_invitation_identifiers = [i.id for i in group.collaboration.invitations if i.status == "open"]
        missing_invitations = list(filter(lambda i: i not in ag_invitation_identifiers, c_invitation_identifiers))
        do_add_group_invitations({
            "group_id": group.id,
            "collaboration_id": group.collaboration_id,
            "invitations_ids": missing_invitations
        })


@group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    collaboration_id = query_param("collaboration_id")

    confirm_collaboration_admin(collaboration_id, True, True)

    existing_group = query_param("existing_group", required=False, default="")
    group = Group.query.options(load_only(Group.id)) \
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

    confirm_collaboration_admin(collaboration_id, True, True)

    existing_group = query_param("existing_group", required=False, default="")
    group = Group.query.options(load_only(Group.id)) \
        .filter(func.lower(Group.short_name) == func.lower(short_name)) \
        .filter(func.lower(Group.short_name) != func.lower(existing_group)) \
        .filter(Group.collaboration_id == collaboration_id) \
        .first()
    return group is not None, 200


@group_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "groups")
def save_group():
    data = current_request.get_json()

    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    res = create_group(collaboration_id, data)

    return res


def create_group(collaboration_id, data, do_cleanse_short_name=True):
    if do_cleanse_short_name:
        cleanse_short_name(data)
    # Check uniqueness of name and short_name of group for the collaboration
    collaboration = db.session.get(Collaboration, collaboration_id)

    def is_duplicate(g: Group):
        short_name_dup = g.short_name == data["short_name"]
        name_dup = g.name == data["name"] and data.get("service_group_id", None) == g.service_group_id
        return name_dup or short_name_dup

    duplicates = [g.id for g in collaboration.groups if is_duplicate(g)]
    if duplicates:
        return {}, 201
    _assign_global_urn(collaboration, data)
    data["identifier"] = str(uuid.uuid4())
    res = save(Group, custom_json=data, allow_child_cascades=False)

    # Session is closed in save, but we are not ready yet, so re-fetch the Group
    group = db.session.get(Group, res[0].id)

    auto_provision_all_members_and_invites(group)

    emit_socket(f"collaboration_{collaboration.id}")
    broadcast_group_changed(group.id)

    return res


def _assign_global_urn(collaboration, data):
    data["global_urn"] = f"{collaboration.organisation.short_name}:{collaboration.short_name}:{data['short_name']}"


@group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_group():
    data = current_request.get_json()

    collaboration_id = int(data["collaboration_id"])
    confirm_collaboration_admin(collaboration_id)
    collaboration = db.session.get(Collaboration, collaboration_id)
    _assign_global_urn(collaboration, data)
    cleanse_short_name(data)
    group = db.session.get(Group, data["id"])
    if group.service_group:
        group.auto_provision_members = data.get("auto_provision_members", False)
        db.session.merge(group)
    else:
        res = update(Group, custom_json=data, allow_child_cascades=False)
        group = res[0]

    auto_provision_all_members_and_invites(group)

    emit_socket(f"collaboration_{collaboration.id}")
    broadcast_group_changed(group.id)

    return group, 201


@group_api.route("/<group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_group(group_id):
    group = Group.query.filter(Group.id == group_id).one()

    confirm_collaboration_admin(group.collaboration_id)

    emit_socket(f"collaboration_{group.collaboration_id}")
    broadcast_group_deleted(group_id)

    return delete(Group, group_id)


@group_api.route("/v1/<group_identifier>", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/add_group_membership.yml")
@json_endpoint
def api_add_group_membership(group_identifier):
    confirm_external_api_call()

    organisation = request_context.external_api_organisation
    group = Group.query \
        .filter(Group.identifier == group_identifier) \
        .one()

    if not organisation or organisation.id != group.collaboration.organisation_id:
        raise Forbidden()

    user = User.query \
        .filter(User.uid == current_request.get_json().get("uid")) \
        .one()

    if not group.collaboration.is_member(user.id):
        raise Conflict(f"User {user.uid} is not a member of collaboration {group.collaboration.name}")
    if group.is_member(user.id):
        raise Conflict(f"User {user.uid} is already member of group {group.name}")

    cm = [m for m in group.collaboration.collaboration_memberships if m.user_id == user.id][0]
    group.collaboration_memberships.append(cm)

    db.session.merge(group)
    db.session.commit()

    emit_socket(f"collaboration_{group.collaboration_id}")
    broadcast_group_changed(group.id)

    return group, 201


@group_api.route("/v1/<group_identifier>/members/<user_uid>", methods=["DELETE"], strict_slashes=False)
@swag_from("../swagger/public/paths/delete_group_membership.yml")
@json_endpoint
def api_delete_group_membership(group_identifier, user_uid):
    confirm_external_api_call()

    organisation = request_context.external_api_organisation
    group_membership = CollaborationMembership.query \
        .join(CollaborationMembership.groups) \
        .join(CollaborationMembership.user) \
        .filter(Group.identifier == group_identifier) \
        .filter(User.uid == user_uid) \
        .one()

    if not organisation or organisation.id != group_membership.collaboration.organisation_id:
        raise Forbidden()

    group = Group.query.filter(Group.identifier == group_identifier).one()
    group.collaboration_memberships.remove(group_membership)

    db.session.merge(group)
    db.session.commit()

    emit_socket(f"collaboration_{group_membership.collaboration_id}")
    broadcast_group_changed(group.id)

    return None, 204
