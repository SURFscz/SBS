# -*- coding: future_fstrings -*-
from flask import Blueprint, request as current_request
from sqlalchemy import func
from sqlalchemy import text
from sqlalchemy.orm import load_only, contains_eager

from server.api.authorisation_group_invitations import do_add_authorisation_group_invitations
from server.api.authorisation_group_members import do_add_authorisation_group_members
from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_collaboration_admin, \
    confirm_collaboration_admin_or_authorisation_group_member, current_user_id
from server.db.db import AuthorisationGroup, CollaborationMembership, UserServiceProfile, Collaboration
from server.db.db import db
from server.db.models import update, save, delete
from server.schemas import json_schema_validator

authorisation_group_api = Blueprint("authorisation_group_api", __name__, url_prefix="/api/authorisation_groups")


def auto_provision_all_members_and_invites(authorisation_group: AuthorisationGroup):
    if not authorisation_group.auto_provision_members:
        return
    ag_member_identifiers = [m.id for m in authorisation_group.collaboration_memberships]
    c_member_identifiers = [m.id for m in authorisation_group.collaboration.collaboration_memberships]
    missing_members = list(filter(lambda m: m not in ag_member_identifiers, c_member_identifiers))
    do_add_authorisation_group_members({
        "authorisation_group_id": authorisation_group.id,
        "collaboration_id": authorisation_group.collaboration_id,
        "members_ids": missing_members
    }, True)

    ag_invitation_identifiers = [i.id for i in authorisation_group.invitations]
    c_invitation_identifiers = [i.id for i in authorisation_group.collaboration.invitations]
    missing_invitations = list(filter(lambda i: i not in ag_invitation_identifiers, c_invitation_identifiers))
    do_add_authorisation_group_invitations({
        "authorisation_group_id": authorisation_group.id,
        "collaboration_id": authorisation_group.collaboration_id,
        "invitations_ids": missing_invitations
    })


@authorisation_group_api.route("/", strict_slashes=False)
@json_endpoint
def my_authorisation_groups():
    user_id = current_user_id()

    authorisation_groups = AuthorisationGroup.query \
        .join(AuthorisationGroup.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .outerjoin(UserServiceProfile, UserServiceProfile.user_id == user_id) \
        .outerjoin(UserServiceProfile.service) \
        .options(contains_eager(AuthorisationGroup.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .options(contains_eager(AuthorisationGroup.user_service_profiles)
                 .contains_eager(UserServiceProfile.service)) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return authorisation_groups, 200


@authorisation_group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    collaboration_id = query_param("collaboration_id")
    existing_authorisation_group = query_param("existing_authorisation_group", required=False, default="")
    authorisation_group = AuthorisationGroup.query.options(load_only("id")) \
        .filter(func.lower(AuthorisationGroup.name) == func.lower(name)) \
        .filter(func.lower(AuthorisationGroup.name) != func.lower(existing_authorisation_group)) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .first()
    return authorisation_group is not None, 200


@authorisation_group_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def short_name_exists():
    short_name = query_param("short_name")
    collaboration_id = query_param("collaboration_id")
    existing_authorisation_group = query_param("existing_authorisation_group", required=False, default="")
    authorisation_group = AuthorisationGroup.query.options(load_only("id")) \
        .filter(func.lower(AuthorisationGroup.short_name) == func.lower(short_name)) \
        .filter(func.lower(AuthorisationGroup.short_name) != func.lower(existing_authorisation_group)) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .first()
    return authorisation_group is not None, 200


@authorisation_group_api.route("/all/<collaboration_id>", strict_slashes=False)
@json_endpoint
def authorisation_groups_by_collaboration(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    authorisation_groups = AuthorisationGroup.query \
        .join(AuthorisationGroup.collaboration) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .all()
    return authorisation_groups, 200


@authorisation_group_api.route("/<authorisation_group_id>/<collaboration_id>", strict_slashes=False)
@json_endpoint
def authorisation_group_by_id(authorisation_group_id, collaboration_id):
    confirm_collaboration_admin_or_authorisation_group_member(collaboration_id, authorisation_group_id)

    authorisation_group = AuthorisationGroup.query \
        .join(AuthorisationGroup.collaboration) \
        .outerjoin(AuthorisationGroup.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user) \
        .outerjoin(AuthorisationGroup.services) \
        .outerjoin(AuthorisationGroup.invitations) \
        .options(contains_eager(AuthorisationGroup.collaboration)) \
        .options(contains_eager(AuthorisationGroup.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .options(contains_eager(AuthorisationGroup.services)) \
        .options(contains_eager(AuthorisationGroup.invitations)) \
        .filter(AuthorisationGroup.id == authorisation_group_id) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .one()
    for member in authorisation_group.collaboration.collaboration_memberships:
        member.user
    return authorisation_group, 200


@authorisation_group_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
@json_schema_validator.validate("models", "authorisation_groups")
def save_authorisation_group():
    data = current_request.get_json()

    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    service_ids = data["service_ids"] if "service_ids" in data else None

    _assign_global_urn(collaboration_id, data)

    res = save(AuthorisationGroup, custom_json=data, allow_child_cascades=False)
    if service_ids:
        authorisation_group_id = res[0].id
        values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", service_ids)))
        statement = f"INSERT into services_authorisation_groups (service_id, authorisation_group_id) VALUES {values}"
        sql = text(statement)
        db.engine.execute(sql)

    auto_provision_all_members_and_invites(res[0])

    return res


def _assign_global_urn(collaboration_id, data):
    collaboration = Collaboration.query \
        .join(Collaboration.organisation) \
        .options(contains_eager(Collaboration.organisation)) \
        .filter(Collaboration.id == collaboration_id).one()
    data["global_urn"] = f"{collaboration.organisation.short_name}:{collaboration.short_name}:{data['short_name']}"


@authorisation_group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_authorisation_group():
    data = current_request.get_json()

    collaboration_id = int(data["collaboration_id"])
    confirm_collaboration_admin(collaboration_id)

    _assign_global_urn(collaboration_id, data)

    res = update(AuthorisationGroup, custom_json=data, allow_child_cascades=False)

    auto_provision_all_members_and_invites(res[0])

    return res


@authorisation_group_api.route("/<authorisation_group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_authorisation_group(authorisation_group_id):
    authorisation_group = AuthorisationGroup.query.filter(AuthorisationGroup.id == authorisation_group_id).one()

    confirm_collaboration_admin(authorisation_group.collaboration_id)
    return delete(AuthorisationGroup, authorisation_group_id)
