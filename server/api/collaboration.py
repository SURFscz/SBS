from flask import Blueprint, request as current_request, session
from sqlalchemy import text

from server.api.base import json_endpoint
from server.db.db import Collaboration, CollaborationMembership, JoinRequest, db, AuthorisationGroup
from server.db.models import update, save, delete
from sqlalchemy.orm import joinedload

collaboration_api = Blueprint("collaboration_api", __name__, url_prefix="/api/collaborations")


@collaboration_api.route("/find_by_name", strict_slashes=False)
@json_endpoint
def collaboration_by_name():
    name = current_request.args.get("name")
    collaboration = Collaboration.query.filter(Collaboration.name == name).one()
    return collaboration, 200


@collaboration_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    sql = text(f"SELECT id, name, description FROM collaborations "
               f"WHERE MATCH (name,description) AGAINST ('{q}*' IN BOOLEAN MODE)")
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@collaboration_api.route("/<id>", strict_slashes=False)
@json_endpoint
def collaboration_by_id(id):
    user_id = session["user"]["id"]
    collaboration = Collaboration.query \
        .options(joinedload(Collaboration.authorisation_groups)
                 .subqueryload(AuthorisationGroup.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user_service_profiles)) \
        .options(joinedload(Collaboration.invitations)) \
        .options(joinedload(Collaboration.join_requests).subqueryload(JoinRequest.user)) \
        .options(joinedload(Collaboration.collaboration_memberships)
                 .subqueryload(CollaborationMembership.user_service_profiles)) \
        .options(joinedload(Collaboration.services)) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(Collaboration.id == id) \
        .one()
    return collaboration, 200


@collaboration_api.route("/", strict_slashes=False)
@json_endpoint
def collaborations():
    user_id = session["user"]["id"]
    res = Collaboration.query \
        .options(joinedload(Collaboration.authorisation_groups)) \
        .options(joinedload(Collaboration.invitations)) \
        .options(joinedload(Collaboration.join_requests).subqueryload(JoinRequest.user)) \
        .options(joinedload(Collaboration.collaboration_memberships)) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id).all()
    return res, 200


@collaboration_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration():
    return save(Collaboration)


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    return update(Collaboration)


@collaboration_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(id):
    return delete(Collaboration, id)
