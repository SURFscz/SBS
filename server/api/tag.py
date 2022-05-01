# -*- coding: future_fstrings -*-

from flask import Blueprint
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_organisation_admin_or_manager, confirm_write_access
from server.db.domain import Tag, Collaboration
from server.db.models import delete

tag_api = Blueprint("api_tag", __name__, url_prefix="/api/tags")


@tag_api.route("/", strict_slashes=False)
@json_endpoint
def all_organisation_tags():
    organisation_id = int(query_param("organisation_id"))
    confirm_organisation_admin_or_manager(organisation_id)

    tags = Tag.query \
        .join(Tag.collaborations) \
        .join(Collaboration.organisation) \
        .filter(Collaboration.organisation_id == organisation_id) \
        .all()
    return tags, 200


@tag_api.route("/all", strict_slashes=False)
@json_endpoint
def all_tags():
    confirm_write_access()
    return Tag.query.options(joinedload(Tag.collaborations).subqueryload(Collaboration.organisation)).all(), 200


@tag_api.route("/<organisation_id>/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_tag(organisation_id, id):
    confirm_organisation_admin_or_manager(organisation_id)
    tag = Tag.query.get(id)
    for collaboration in tag.collaborations:
        if collaboration.organisation_id != int(organisation_id):
            raise Forbidden()
    return delete(Tag, id)


@tag_api.route("/orphans", strict_slashes=False)
@json_endpoint
def orphan_tags():
    confirm_write_access()

    return Tag.query.filter(~Tag.collaborations.any()).all(), 200
