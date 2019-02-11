import uuid

from flask import Blueprint, request as current_request
from sqlalchemy import text
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin, current_user
from server.db.db import db, UserServiceProfile, AuthorisationGroup, CollaborationMembership

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
    statement = f"INSERT INTO collaboration_memberships_authorisation_groups " \
        f"(collaboration_membership_id, authorisation_group_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    # Create an UserServiceProfile for each Service linked to the AuthorisationGroup
    # for each new CollaborationMembership
    authorisation_group = AuthorisationGroup.query.get(authorisation_group_id)
    services = authorisation_group.services
    user = current_user()
    for member_id in members_ids:
        collaboration_member = CollaborationMembership.query.get(member_id)
        for service in services:
            profile = UserServiceProfile(service=service, user_id=collaboration_member.user_id,
                                         authorisation_group=authorisation_group,
                                         created_by=user["uid"], updated_by=["uid"], identifier=str(uuid.uuid4()))
            db.session.add(profile)

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


@authorisation_group_members_api.route("/<authorisation_group_id>/<collaboration_membership_id>/<collaboration_id>",
                                       methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_authorisation_group_members(authorisation_group_id, collaboration_membership_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM user_service_profiles WHERE " \
        f"user_id IN (SELECT user_id from collaboration_memberships WHERE id = {collaboration_membership_id})" \
        f"AND service_id IN (SELECT service_id FROM services_authorisation_groups " \
        f"WHERE authorisation_group_id = {authorisation_group_id})"
    sql = text(statement)
    db.engine.execute(sql)

    statement = f"DELETE FROM collaboration_memberships_authorisation_groups " \
        f"WHERE collaboration_membership_id = {collaboration_membership_id}" \
        f" AND authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)
    return (None, 204) if result_set.rowcount > 0 else (None, 404)
