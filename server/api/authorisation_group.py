from flask import Blueprint, request as current_request
from sqlalchemy import func
from sqlalchemy import text
from sqlalchemy.orm import load_only, contains_eager

from server.api.base import json_endpoint
from server.api.security import confirm_collaboration_admin, confirm_collaboration_admin_or_authorisation_group_member
from server.db.db import AuthorisationGroup, CollaborationMembership
from server.db.db import db
from server.db.models import update, save, delete

authorisation_group_api = Blueprint("authorisation_group_api", __name__, url_prefix="/api/authorisation_groups")


@authorisation_group_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = current_request.args.get("name")
    collaboration_id = current_request.args.get("collaboration_id")
    existing_authorisation_group = current_request.args.get("existing_authorisation_group", "")
    org = AuthorisationGroup.query.options(load_only("id")) \
        .filter(func.lower(AuthorisationGroup.name) == func.lower(name)) \
        .filter(func.lower(AuthorisationGroup.name) != func.lower(existing_authorisation_group)) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .first()
    return org is not None, 200


@authorisation_group_api.route("/<authorisation_group_id>/<collaboration_id>", strict_slashes=False)
@json_endpoint
def authorisation_group_by_id(authorisation_group_id, collaboration_id):
    confirm_collaboration_admin_or_authorisation_group_member(collaboration_id, authorisation_group_id)

    authorisation_group = AuthorisationGroup.query \
        .join(AuthorisationGroup.collaboration) \
        .outerjoin(AuthorisationGroup.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user) \
        .outerjoin(AuthorisationGroup.services) \
        .options(contains_eager(AuthorisationGroup.collaboration)) \
        .options(contains_eager(AuthorisationGroup.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .options(contains_eager(AuthorisationGroup.services)) \
        .filter(AuthorisationGroup.id == authorisation_group_id) \
        .filter(AuthorisationGroup.collaboration_id == collaboration_id) \
        .one()
    for member in authorisation_group.collaboration.collaboration_memberships:
        member.user
    return authorisation_group, 200


@authorisation_group_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_authorisation_group():
    data = current_request.get_json()

    confirm_collaboration_admin(data["collaboration_id"])

    service_ids = data["service_ids"] if "service_ids" in data else None

    res = save(AuthorisationGroup, custom_json=data, allow_child_cascades=False)
    if service_ids:
        authorisation_group_id = res[0].id
        values = ",".join(list(map(lambda id: f"({id},{authorisation_group_id})", service_ids)))
        statement = f"INSERT into services_authorisation_groups (service_id, authorisation_group_id) VALUES {values}"
        sql = text(statement)
        db.engine.execute(sql)
    return res


@authorisation_group_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_authorisation_group():
    data = current_request.get_json()

    confirm_collaboration_admin(data["collaboration_id"])

    return update(AuthorisationGroup, custom_json=data, allow_child_cascades=False)


@authorisation_group_api.route("/<authorisation_group_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_authorisation_group(authorisation_group_id):
    return delete(AuthorisationGroup, authorisation_group_id)
