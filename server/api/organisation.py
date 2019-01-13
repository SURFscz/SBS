from flask import Blueprint, request as current_request, session
from sqlalchemy import text
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.db.db import Organisation, db, OrganisationMembership, Collaboration
from server.db.models import update, save, delete

organisation_api = Blueprint("organisation_api", __name__, url_prefix="/api/organisations")


@organisation_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    sql = text(f"SELECT id, name, description FROM organisations "
               f"WHERE MATCH (name, description) AGAINST ('{q}*' IN BOOLEAN MODE)")
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@organisation_api.route("/<id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(id):
    user_id = session["user"]["id"]
    collaboration = Organisation.query \
        .options(joinedload(Organisation.organisation_memberships)
                 .subqueryload(OrganisationMembership.user)) \
        .options(joinedload(Organisation.collaborations)
                 .subqueryload(Collaboration.collaboration_memberships)) \
        .join(OrganisationMembership.user) \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(Organisation.id == id) \
        .one()
    return collaboration, 200


@organisation_api.route("/", strict_slashes=False)
@json_endpoint
def my_organisations():
    user_id = session["user"]["id"]
    organisations = Organisation.query \
        .options(joinedload(Organisation.organisation_memberships)
                 .subqueryload(OrganisationMembership.user)) \
        .join(OrganisationMembership.user) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    return organisations, 200


@organisation_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_organisation():
    return save(Organisation)


@organisation_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_organisation():
    return update(Organisation)


@organisation_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(id):
    return delete(Organisation, id)
