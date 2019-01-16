from flask import session, g as request_context
from werkzeug.exceptions import Forbidden

from server.db.db import Collaboration, CollaborationMembership, Organisation, OrganisationMembership


def confirm_write_access(*args, override_func=None):
    if request_context.is_authorized_api_call:
        return "write" in request_context.api_user.scope
    if not session["user"]["admin"] and (not override_func or not override_func(*args)):
        raise Forbidden()


def confirm_collaboration_admin(collaboration_id):
    def override_func():
        user_id = session["user"]["id"]
        return Collaboration.query \
            .join(Collaboration.collaboration_memberships) \
            .filter(CollaborationMembership.user_id == user_id) \
            .filter(CollaborationMembership.role == "admin") \
            .filter(Collaboration.id == collaboration_id) \
            .count() > 0

    confirm_write_access(override_func=override_func)


def confirm_organization_admin(organisation_id):
    def override_func():
        user_id = session["user"]["id"]
        return Organisation.query \
            .join(Organisation.organisation_memberships) \
            .filter(OrganisationMembership.user_id == user_id) \
            .filter(OrganisationMembership.role == "admin") \
            .filter(OrganisationMembership.organisation_id == organisation_id) \
            .count() > 0

    confirm_write_access(override_func=override_func)
