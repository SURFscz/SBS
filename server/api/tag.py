from flask import Blueprint
from sqlalchemy.orm import selectinload
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_organisation_admin_or_manager, confirm_write_access
from server.db.db import db
from server.db.domain import Tag, Collaboration
from server.db.models import delete

tag_api = Blueprint("api_tag", __name__, url_prefix="/api/tags")


@tag_api.route("/", strict_slashes=False)
@json_endpoint
def all_organisation_tags():
    organisation_id = int(query_param("organisation_id"))
    confirm_organisation_admin_or_manager(organisation_id)

    tags = Tag.query \
        .filter(Tag.organisation_id == organisation_id) \
        .all()
    return tags, 200


@tag_api.route("/all", strict_slashes=False)
@json_endpoint
def all_tags():
    confirm_write_access()
    tags = Tag.query \
        .options(selectinload(Tag.collaborations)
                 .joinedload(Collaboration.organisation, innerjoin=True)) \
        .all()
    return tags, 200


@tag_api.route("/<organisation_id>/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_tag(organisation_id, id):
    confirm_organisation_admin_or_manager(organisation_id)
    tag = db.session.get(Tag, id)
    if tag.organisation_id != int(organisation_id):
        raise Forbidden()
    return delete(Tag, id)


@tag_api.route("/orphans", strict_slashes=False)
@json_endpoint
def orphan_tags():
    confirm_write_access()
    return Tag.query.filter(Tag.is_default == False).filter(~Tag.collaborations.any()).all(), 200  # noqa: E712


@tag_api.route("/usages/<organisation_id>/<tag_id>", strict_slashes=False)
@json_endpoint
def usages(organisation_id, tag_id):
    confirm_organisation_admin_or_manager(organisation_id)
    tag = db.session.get(Tag, tag_id)
    return {
        "collaborations": [co.name for co in tag.collaborations],
    }, 200
