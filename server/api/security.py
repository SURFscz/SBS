from flask import session, g as request_context, request as current_request, current_app
from werkzeug.exceptions import Forbidden

from server.db.db import Collaboration, CollaborationMembership, Organisation, OrganisationMembership


def is_admin_user(uid):
    return len(list(filter(lambda u: u.uid == uid, current_app.app_config.admin_users))) == 1


def is_application_admin():
    return session["user"]["admin"]


def _get_impersonated_session():
    if not is_application_admin():
        return session

    headers = current_request.headers
    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    impersonate_uid = headers.get("X-IMPERSONATE-UID", default=None)
    impersonate_name = headers.get("X-IMPERSONATE-NAME", default=None)
    impersonate_mail = headers.get("X-IMPERSONATE-EMAIL", default=None)
    if impersonate_id and impersonate_uid and impersonate_name:
        return {
            "user": {
                "id": impersonate_id,
                "uid": impersonate_uid,
                "name": impersonate_name,
                "email": impersonate_mail,
                "admin": is_admin_user(impersonate_uid)
            }
        }
    return session


def current_user():
    return _get_impersonated_session()["user"]


def current_user_id():
    return _get_impersonated_session()["user"]["id"]


def current_user_uid():
    return _get_impersonated_session()["user"]["uid"]


def current_user_name():
    return _get_impersonated_session()["user"]["name"]


def confirm_allow_impersonation():
    if not session["user"]["admin"]:
        raise Forbidden()


def confirm_write_access(*args, override_func=None):
    if request_context.is_authorized_api_call:
        return "write" in request_context.api_user.scope
    if not is_application_admin() and (not override_func or not override_func(*args)):
        raise Forbidden()


def confirm_collaboration_admin(collaboration_id):
    def override_func():
        user_id = current_user_id()
        return Collaboration.query \
                   .join(Collaboration.collaboration_memberships) \
                   .filter(CollaborationMembership.user_id == user_id) \
                   .filter(CollaborationMembership.role == "admin") \
                   .filter(Collaboration.id == collaboration_id) \
                   .count() > 0

    confirm_write_access(override_func=override_func)


def confirm_organization_admin(organisation_id):
    def override_func():
        user_id = current_user_id()
        return Organisation.query \
                   .join(Organisation.organisation_memberships) \
                   .filter(OrganisationMembership.user_id == user_id) \
                   .filter(OrganisationMembership.role == "admin") \
                   .filter(OrganisationMembership.organisation_id == organisation_id) \
                   .count() > 0

    confirm_write_access(override_func=override_func)
