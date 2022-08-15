# -*- coding: future_fstrings -*-
import hashlib
from secrets import token_urlsafe

from flask import session, g as request_context, request as current_request, current_app
from sqlalchemy.orm import load_only
from werkzeug.exceptions import Forbidden, SecurityError

from server.db.domain import CollaborationMembership, OrganisationMembership, Group, Collaboration, User, \
    ServiceMembership

MIN_SECRET_LENGTH = 43


def is_admin_user(user):
    admin_users = current_app.app_config.admin_users
    uid = user.uid if isinstance(user, User) else user["uid"]
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
                "admin": is_admin_user({"uid": impersonate_uid}),
                "second_factor_confirmed": True,
                "guest": False
            }
        }
    return session


def is_application_admin():
    impersonated_session = _get_impersonated_session()
    return impersonated_session["user"]["admin"]


def current_user():
    return _get_impersonated_session()["user"]


def current_user_id():
    return _get_impersonated_session()["user"]["id"]


def current_user_uid():
    return _get_impersonated_session()["user"]["uid"]


def current_user_name():
    return _get_impersonated_session()["user"]["name"]


def confirm_allow_impersonation(confirm_feature_impersonation_allowed=True):
    if "user" not in session or "admin" not in session["user"] or not session["user"]["admin"]:
        raise Forbidden()
    if confirm_feature_impersonation_allowed and not current_app.app_config.feature.impersonation_allowed:
        raise Forbidden()
    return True


def confirm_external_api_call():
    if "external_api_organisation" not in request_context and not hasattr(request_context, "external_api_organisation"):
        raise Forbidden("Not a valid external API call")


def confirm_authorized_api_call():
    if not request_context.is_authorized_api_call and not is_application_admin():
        raise Forbidden()


def confirm_scope_access(*args, override_func=None, scope):
    if request_context.is_authorized_api_call:
        if scope is None or scope not in request_context.api_user.scopes:
            raise Forbidden()
    elif not is_application_admin() and (not override_func or not override_func(*args)):
        raise Forbidden()
    return True


def confirm_read_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="read")


def confirm_write_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="write")


def confirm_ipaddress_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="ipaddress")


def is_current_user_collaboration_admin(collaboration_id):
    return is_collaboration_admin(current_user_id(), collaboration_id)


def is_current_user_organisation_admin_or_manager(collaboration_id):
    return is_organisation_admin_or_manager(Collaboration.query.get(collaboration_id).organisation_id)


def is_collaboration_admin(user_id=None, collaboration_id=None):
    user_id = user_id if user_id else current_user_id()
    query = CollaborationMembership.query \
        .options(load_only("id")) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(CollaborationMembership.role == "admin")
    if collaboration_id:
        query = query.filter(CollaborationMembership.collaboration_id == collaboration_id)
    count = query.count()
    return count > 0


def is_organisation_admin(organisation_id=None):
    return _has_organisation_role(organisation_id, ["admin"])


def is_organisation_admin_or_manager(organisation_id=None):
    return _has_organisation_role(organisation_id, ["admin", "manager"])


def _has_organisation_role(organisation_id, roles):
    user_id = current_user_id()
    query = OrganisationMembership.query \
        .options(load_only("user_id")) \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(OrganisationMembership.role.in_(roles))
    if organisation_id:
        query = query.filter(OrganisationMembership.organisation_id == int(organisation_id))
    return query.count() > 0


def confirm_organisation_admin(organisation_id=None):
    def override_func():
        return is_organisation_admin(organisation_id)

    confirm_write_access(override_func=override_func)


def confirm_organisation_admin_or_manager(organisation_id):
    def override_func():
        return is_organisation_admin_or_manager(organisation_id)

    confirm_write_access(override_func=override_func)


def confirm_collaboration_admin(collaboration_id, org_manager_allowed=True, read_only=False):
    def override_func():
        user_id = current_user_id()
        coll_admin = is_collaboration_admin(user_id, collaboration_id)
        if not coll_admin:
            collaboration = Collaboration.query.get(collaboration_id)
            if not collaboration:
                return False
            org_id = collaboration.organisation_id
            allowed = is_organisation_admin_or_manager(org_id) if org_manager_allowed else is_organisation_admin(org_id)
            return allowed
        return True

    if read_only:
        confirm_read_access(override_func=override_func)
    else:
        confirm_write_access(override_func=override_func)


def confirm_collaboration_member(collaboration_id):
    def override_func():
        user_id = current_user_id()
        is_member = CollaborationMembership.query \
                        .options(load_only("id")) \
                        .filter(CollaborationMembership.user_id == user_id) \
                        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
                        .count() > 0
        if is_member:
            return True
        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return False
        return is_organisation_admin_or_manager(collaboration.organisation_id)

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


def is_service_admin(service_id=None):
    user_id = current_user_id()
    query = ServiceMembership.query \
        .options(load_only("user_id")) \
        .filter(ServiceMembership.user_id == user_id)
    if service_id:
        query = query.filter(ServiceMembership.service_id == service_id)
    return query.count() > 0


def confirm_service_admin(service_id=None):
    def override_func():
        return is_service_admin(service_id)

    confirm_write_access(override_func=override_func)


def secure_hash(secret):
    return f"sha3_512_{hashlib.sha3_512(bytes(secret, 'utf-8')).hexdigest()}"


def generate_token():
    return f"A{token_urlsafe()}"


def hash_secret_key(data, attr_name="hashed_secret"):
    secret = data[attr_name]
    if len(secret) < MIN_SECRET_LENGTH:
        raise SecurityError(f"minimal length of secret for API key is {MIN_SECRET_LENGTH}")
    data[attr_name] = secure_hash(secret)
    return data
