from flask import Blueprint

from server.api.base import json_endpoint
from server.api.security import confirm_write_access
from server.db.db import CollaborationMembership, db

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
