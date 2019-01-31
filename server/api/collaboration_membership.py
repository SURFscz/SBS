from flask import Blueprint
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.api.security import confirm_write_access, current_user_id
from server.db.db import CollaborationMembership, db, UserServiceProfile, AuthorisationGroup

collaboration_membership_api = Blueprint("collaboration_membership_api", __name__,
                                         url_prefix="/api/collaboration_memberships")


@collaboration_membership_api.route("/<collaboration_id>/<user_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration_membership(collaboration_id, user_id):
    confirm_write_access()
    row_count = CollaborationMembership.query \
        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .delete()
    db.session.commit()
    return (None, 204) if row_count > 0 else (None, 404)


@collaboration_membership_api.route("/", strict_slashes=False)
@json_endpoint
def my_collaboration_memberships():
    user_id = current_user_id()
    res = CollaborationMembership.query \
        .join(CollaborationMembership.authorisation_groups) \
        .join(AuthorisationGroup.collaboration) \
        .join(CollaborationMembership.user_service_profiles) \
        .join(UserServiceProfile.service) \
        .options(contains_eager(CollaborationMembership.authorisation_groups)
                 .contains_eager(AuthorisationGroup.collaboration)) \
        .options(contains_eager(CollaborationMembership.user_service_profiles)
                 .contains_eager(UserServiceProfile.service)) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return res, 200
