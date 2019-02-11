import uuid

from flask import Blueprint, request as current_request
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_collaboration_admin, current_user
from server.db.db import db, AuthorisationGroup, UserServiceProfile, CollaborationMembership

authorisation_group_services_api = Blueprint("authorisation_group_services_api", __name__,
                                             url_prefix="/api/authorisation_group_services")


@authorisation_group_services_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_authorisation_group_services():
    data = current_request.get_json()
    authorisation_group_id = data["authorisation_group_id"]
    collaboration_id = data["collaboration_id"]

    confirm_collaboration_admin(collaboration_id)

    authorisation_group = AuthorisationGroup.query.get(authorisation_group_id)
    service_ids = data["service_ids"]
    values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", service_ids)))
    statement = f"INSERT into services_authorisation_groups (service_id, authorisation_group_id) VALUES {values}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    # Create an UserServiceProfile for each CollaborationMembership linked to the AuthorisationGroup
    # for each new Service
    collaboration_memberships = authorisation_group.collaboration_memberships
    user = current_user()
    for service_id in service_ids:
        for member in collaboration_memberships:
            profile = UserServiceProfile(service_id=service_id, authorisation_group=authorisation_group,
                                         user_id=member.user_id,
                                         created_by=user["uid"], updated_by=["uid"], identifier=str(uuid.uuid4()))
            db.session.add(profile)

    return (None, 201) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_services_api.route("/delete_all_services/<authorisation_group_id>/<collaboration_id>",
                                        methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_all_authorisation_group_services(authorisation_group_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM user_service_profiles WHERE service_id in " \
        f"(SELECT service_id FROM services_authorisation_groups " \
        f"WHERE authorisation_group_id = {authorisation_group_id})"
    sql = text(statement)
    db.engine.execute(sql)

    statement = f"DELETE from services_authorisation_groups WHERE authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    return (None, 204) if result_set.rowcount > 0 else (None, 404)


@authorisation_group_services_api.route("/<authorisation_group_id>/<service_id>/<collaboration_id>", methods=["DELETE"],
                                        strict_slashes=False)
@json_endpoint
def delete_authorisation_group_services(authorisation_group_id, service_id, collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    statement = f"DELETE FROM user_service_profiles WHERE service_id = {service_id} AND " \
        f"authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    db.engine.execute(sql)

    statement = f"DELETE from services_authorisation_groups WHERE service_id = {service_id}" \
        f" AND authorisation_group_id = {authorisation_group_id}"
    sql = text(statement)
    result_set = db.engine.execute(sql)

    return (None, 204) if result_set.rowcount > 0 else (None, 404)
