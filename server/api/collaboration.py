import uuid

from flask import Blueprint, request as current_request, session
from sqlalchemy import text, or_
from sqlalchemy.orm import aliased, load_only, contains_eager
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.api.security import confirm_collaboration_admin, confirm_organization_admin
from server.db.db import Collaboration, CollaborationMembership, JoinRequest, db, AuthorisationGroup, User
from server.db.models import update, save, delete

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
               f"WHERE MATCH (name,description) AGAINST ('{q}*' IN BOOLEAN MODE) AND id > 0 LIMIT 16")
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


# Call for LSC to get all members based on the identifier of the Collaboration
@collaboration_api.route("/members", strict_slashes=False)
@json_endpoint
def members():
    identifier = current_request.args.get("identifier")
    collaboration_authorisation_group = aliased(Collaboration)
    collaboration_membership = aliased(Collaboration)

    users = User.query \
        .options(load_only("uid", "name")) \
        .join(User.collaboration_memberships) \
        .join(collaboration_membership, CollaborationMembership.collaboration) \
        .join(CollaborationMembership.authorisation_groups) \
        .join(collaboration_authorisation_group, AuthorisationGroup.collaboration) \
        .filter(or_(collaboration_authorisation_group.identifier == identifier,
                    collaboration_membership.identifier == identifier)) \
        .all()
    return users, 200


@collaboration_api.route("/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_by_id(collaboration_id):
    authorisation_group_collaboration_memberships = aliased(CollaborationMembership)
    collaboration_collaboration_memberships = aliased(CollaborationMembership)

    query = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.authorisation_groups) \
        .outerjoin(authorisation_group_collaboration_memberships, AuthorisationGroup.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user_service_profiles) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(collaboration_collaboration_memberships, Collaboration.collaboration_memberships) \
        .outerjoin(Collaboration.services) \
        .options(contains_eager(Collaboration.authorisation_groups)
                 .contains_eager(AuthorisationGroup.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user_service_profiles)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Collaboration.services))

    if not session["user"]["admin"]:
        user_id = session["user"]["id"]
        query = query \
            .join(Collaboration.collaboration_memberships) \
            .filter(CollaborationMembership.user_id == user_id)
    collaboration = query.filter(Collaboration.id == collaboration_id).one()
    return collaboration, 200


@collaboration_api.route("/", strict_slashes=False)
@json_endpoint
def my_collaborations():
    user_id = session["user"]["id"]
    res = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.authorisation_groups) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(Collaboration.services) \
        .options(joinedload(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Collaboration.authorisation_groups)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.services)) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return res, 200


@collaboration_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration():
    def _pre_save_callback(json_dict):
        json_dict["identifier"] = str(uuid.uuid4())
        json_dict["collaboration_memberships"] = [{
            "role": "admin", "user_id": session["user"]["id"]
        }]
        return json_dict

    confirm_organization_admin(current_request.get_json()["organisation_id"])
    res = save(Collaboration, pre_save_callback=_pre_save_callback)
    return res


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    confirm_collaboration_admin(current_request.get_json()["id"])
    return update(Collaboration)


@collaboration_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(id):
    confirm_collaboration_admin(id)
    return delete(Collaboration, id)
