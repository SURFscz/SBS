# -*- coding: future_fstrings -*-
import hashlib

from flask import session, g as request_context, request as current_request, current_app
from sqlalchemy.orm import load_only
from werkzeug.exceptions import Forbidden

from server.db.domain import CollaborationMembership, OrganisationMembership, Group, Collaboration, Organisation


def is_admin_user(uid):
    admin_users = current_app.app_config.admin_users
    return len(list(filter(lambda u: u.uid == uid, admin_users))) == 1


def _get_impersonated_session():
    if not session["user"]["admin"]:
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


def is_application_admin():
    return _get_impersonated_session()["user"]["admin"]


def current_user():
    return _get_impersonated_session()["user"]


def current_user_id():
    return _get_impersonated_session()["user"]["id"]


def current_user_uid():
    return _get_impersonated_session()["user"]["uid"]


def current_user_name():
    return _get_impersonated_session()["user"]["name"]


def confirm_allow_impersonation():
    if "user" not in session or "admin" not in session["user"] or not session["user"]["admin"]:
        raise Forbidden()
    return True


def external_api_call():
    if "external_api_organisation" not in request_context:
        raise Forbidden("Not a valid external API call")


def confirm_authorized_api_call():
    if not request_context.is_authorized_api_call and not is_application_admin():
        raise Forbidden()


def confirm_read_access(*args, override_func=None):
    if request_context.is_authorized_api_call:
        return "read" in request_context.api_user.scopes
    if not is_application_admin() and (not override_func or not override_func(*args)):
        raise Forbidden()


def confirm_write_access(*args, override_func=None):
    if request_context.is_authorized_api_call:
        return "write" in request_context.api_user.scopes
    if not is_application_admin() and (not override_func or not override_func(*args)):
        raise Forbidden()


def is_current_user_collaboration_admin(collaboration_id):
    return is_collaboration_admin(current_user_id(), collaboration_id)


def is_current_user_organisation_admin(collaboration_id):
    return is_organisation_admin(Collaboration.query.get(collaboration_id).organisation_id)


def is_collaboration_admin(user_id=None, collaboration_id=None, organisation_id=None):
    user_id = user_id if user_id else current_user_id()
    query = CollaborationMembership.query \
        .options(load_only("id")) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(CollaborationMembership.role == "admin")
    if collaboration_id:
        query = query.filter(CollaborationMembership.collaboration_id == collaboration_id)
    if organisation_id:
        query = query \
            .join(CollaborationMembership.collaboration) \
            .join(Collaboration.organisation) \
            .filter(Organisation.id == organisation_id)
    count = query.count()
    return count > 0


def is_organisation_admin(organisation_id=None):
    user_id = current_user_id()
    query = OrganisationMembership.query \
        .options(load_only("user_id")) \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(OrganisationMembership.role == "admin")
    if organisation_id:
        query = query.filter(OrganisationMembership.organisation_id == organisation_id)
    return query.count() > 0


def confirm_organisation_admin(organisation_id):
    def override_func():
        return is_organisation_admin(organisation_id)

    confirm_write_access(override_func=override_func)


def confirm_collaboration_admin(collaboration_id):
    def override_func():
        user_id = current_user_id()
        return is_collaboration_admin(user_id, collaboration_id) or is_organisation_admin(
            Collaboration.query.get(collaboration_id).organisation_id)

    confirm_write_access(override_func=override_func)


def confirm_collaboration_member(collaboration_id):
    def override_func():
        user_id = current_user_id()
        return CollaborationMembership.query \
                   .options(load_only("id")) \
                   .filter(CollaborationMembership.user_id == user_id) \
                   .filter(CollaborationMembership.collaboration_id == collaboration_id) \
                   .count() > 0

    confirm_write_access(override_func=override_func)


def confirm_group_member(group_id):
    user_id = current_user_id()
    count = Group.query \
        .options(load_only("id")) \
        .join(Group.collaboration_memberships) \
        .filter(Group.id == group_id) \
        .filter(CollaborationMembership.user_id == user_id) \
        .count()
    return count > 0


def confirm_collaboration_admin_or_group_member(collaboration_id, group_id):
    def override_func():
        user_id = current_user_id()
        collaboration_admin = is_collaboration_admin(user_id, collaboration_id)
        if not collaboration_admin:
            return confirm_group_member(group_id) or is_current_user_organisation_admin(collaboration_id)
        return collaboration_admin

    confirm_write_access(override_func=override_func)


def secure_hash(secret):
    return hashlib.sha256(bytes(secret, "utf-8")).hexdigest()
