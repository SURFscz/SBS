# -*- coding: future_fstrings -*-

from flask import Blueprint, request as current_request
from munch import munchify
from sqlalchemy import text
from sqlalchemy.orm import aliased, contains_eager

from server.api.base import json_endpoint, query_param
from server.api.user_service_profile import create_user_service_profile
from server.auth.security import confirm_collaboration_admin, current_user
from server.db.db import db, UserServiceProfile, AuthorisationGroup, CollaborationMembership, User

authorisation_group_members_api = Blueprint("authorisation_group_members_api", __name__,
                                            url_prefix="/api/authorisation_group_members")


def do_add_authorisation_group_members(data, assert_collaboration_admin):
    authorisation_group_id = data["authorisation_group_id"]
    collaboration_id = data["collaboration_id"]
    if assert_collaboration_admin:
        confirm_collaboration_admin(collaboration_id)

    members_ids = data["members_ids"]
    if len(members_ids) == 0:
        return munchify({"rowcount": 1})
    values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", members_ids)))
    statement = f"INSERT INTO collaboration_memberships_authorisation_groups " \
        f"(collaboration_membership_id, authorisation_group_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    db.session.commit()
    # Create an UserServiceProfile for each Service linked to the AuthorisationGroup
    # for each new CollaborationMembership
    authorisation_group = AuthorisationGroup.query.get(authorisation_group_id)
    for member_id in members_ids:
        collaboration_member = CollaborationMembership.query.get(member_id)
        create_user_service_profile([s.id for s in authorisation_group.services], authorisation_group, current_user(),
                                    collaboration_member.user_id)
    return result_set


@authorisation_group_members_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_authorisation_group_members():
    data = current_request.get_json()
    result_set = do_add_authorisation_group_members(data, True)

    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_members_api.route("/delete_all_members/<authorisation_group_id>/<collaboration_id>",
                                       methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_authorisation_group_members(authorisation_group_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM user_service_profiles WHERE service_id in " \
        f"(SELECT service_id FROM services_authorisation_groups " \
        f"WHERE authorisation_group_id = {authorisation_group_id})"
    sql = text(statement)
    db.engine.execute(sql)

    statement = f"DELETE from collaboration_memberships_authorisation_groups " \
        f"WHERE authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_members_api.route("/delete_pre_flight", strict_slashes=False)
@json_endpoint
def delete_pre_flight():
    authorisation_group_id = query_param("authorisation_group_id")
    collaboration_membership_id = query_param("collaboration_membership_id")
    collaboration_id = query_param("collaboration_id")

    confirm_collaboration_admin(collaboration_id)

    collaboration_memberships_user = aliased(User)
    user_service_profile_user = aliased(User)

    user_service_profiles = UserServiceProfile.query \
        .join(UserServiceProfile.authorisation_group) \
        .join(user_service_profile_user, UserServiceProfile.user) \
        .join(AuthorisationGroup.collaboration_memberships) \
        .join(collaboration_memberships_user, CollaborationMembership.user) \
        .options(contains_eager(UserServiceProfile.user, alias=user_service_profile_user)) \
        .filter(collaboration_memberships_user.id == user_service_profile_user.id) \
        .filter(UserServiceProfile.authorisation_group_id == authorisation_group_id) \
        .filter(CollaborationMembership.id == collaboration_membership_id) \
        .all()

    return user_service_profiles, 200


@authorisation_group_members_api.route("/<authorisation_group_id>/<collaboration_membership_id>/<collaboration_id>",
                                       methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_authorisation_group_members(authorisation_group_id, collaboration_membership_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM user_service_profiles WHERE authorisation_group_id = {authorisation_group_id} AND " \
        f"user_id IN (SELECT user_id from collaboration_memberships WHERE id = {collaboration_membership_id})"
    sql = text(statement)
    db.engine.execute(sql)

    statement = f"DELETE FROM collaboration_memberships_authorisation_groups " \
        f"WHERE collaboration_membership_id = {collaboration_membership_id}" \
        f" AND authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
