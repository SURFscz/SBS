from flask import session, g as request_context, request as current_request, current_app
from sqlalchemy.orm import load_only
from werkzeug.exceptions import Forbidden, NotFound

from server.db.db import db
from server.db.domain import (CollaborationMembership, OrganisationMembership, Collaboration, User,
                              ServiceMembership, ApiKey)

CSRF_TOKEN = "CSRFToken"


def is_admin_user(user):
    admin_users = current_app.app_config.admin_users
    uid = user.uid if isinstance(user, User) else user["uid"]
    return uid in (u.uid for u in admin_users)


def _get_impersonated_session():
    if "user" not in session:
        return {"user": {"id": None}}
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


def has_org_manager_unit_access(user_id, collaboration, org_manager_allowed=True):
    if is_application_admin():
        return True
    members = list(filter(lambda m: m.user_id == user_id, collaboration.organisation.organisation_memberships))
    if not members:
        return False
    membership = members[0]
    if membership.role == "admin":
        return True
    if not org_manager_allowed:
        return False
    unit_allowed = True
    if membership.units:
        unit_allowed = collaboration.is_allowed_unit_organisation_membership(membership)
    return unit_allowed


def confirm_api_key_unit_access(api_key: ApiKey, collaboration: Collaboration):
    if not api_key:
        raise Forbidden("ApiKey is None")
    if not collaboration:
        raise Forbidden("Collaboration is None")
    # The ApiKey must be for the same Organisation as the Organisation of the Collaboration
    if api_key.organisation_id != collaboration.organisation_id:
        raise Forbidden(f"ApiKey Organisation({api_key.organisation.name}) does not equals the "
                        f"Organisation({collaboration.organisation.name}) of the Collaboration({collaboration.name})")
    # If an ApiKey is not scoped, then we can't enforce anything
    if not api_key.units:
        return
    # For an ApiKey with a unit, it is not allowed to request information about a CO that does not have a unit
    if not collaboration.units or not all(unit in api_key.units for unit in collaboration.units):
        api_key_unit_names = [unit.name for unit in api_key.units]
        raise Forbidden(f"ApiKey with units ({api_key_unit_names}) has no access to collaboration {collaboration.name}")


def is_application_admin():
    impersonated_session = _get_impersonated_session()
    return impersonated_session["user"].get("admin", False)


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
    organisation = request_context.get("external_api_organisation", None)
    if not organisation:
        raise Forbidden("Not a valid external API call")


def confirm_organisation_api_collaboration(collaboration_identifier, collaboration=None):
    confirm_external_api_call()
    organisation = request_context.external_api_organisation
    if collaboration is None:
        collaboration = Collaboration.query.filter(Collaboration.identifier == collaboration_identifier).one()
    if not organisation or not collaboration or organisation.id != collaboration.organisation_id:
        # i.e., CO not found (or not in this Org)
        raise NotFound()
    return collaboration


def confirm_authorized_api_call():
    if not request_context.is_authorized_api_call and not is_application_admin():
        raise Forbidden()


def confirm_scope_access(*args, override_func=None, scope):
    if request_context and request_context.is_authorized_api_call:
        if scope is None or scope not in request_context.api_user.scopes:
            raise Forbidden()
    elif not is_application_admin() and (not override_func or not override_func(*args)):
        raise Forbidden()
    return True


def confirm_read_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="read")


def confirm_write_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="write")


def confirm_stats_access(*args, override_func=None):
    return confirm_scope_access(*args, override_func=override_func, scope="stats")


def is_current_user_organisation_admin_or_manager(collaboration_id):
    return is_organisation_admin_or_manager(db.session.get(Collaboration, collaboration_id).organisation_id)


def is_collaboration_admin(user_id=None, collaboration_id=None):
    user_id = user_id if user_id else current_user_id()
    query = CollaborationMembership.query \
        .options(load_only(CollaborationMembership.id)) \
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
        .options(load_only(OrganisationMembership.user_id)) \
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
            collaboration = db.session.get(Collaboration, collaboration_id)
            if not collaboration:
                return False
            return has_org_manager_unit_access(user_id, collaboration, org_manager_allowed=org_manager_allowed)
        return True

    if read_only:
        confirm_read_access(override_func=override_func)
    else:
        confirm_write_access(override_func=override_func)


def confirm_collaboration_member(collaboration_id):
    def override_func():
        user_id = current_user_id()
        is_member = CollaborationMembership.query \
                        .options(load_only(CollaborationMembership.id)) \
                        .filter(CollaborationMembership.user_id == user_id) \
                        .filter(CollaborationMembership.collaboration_id == collaboration_id) \
                        .count() > 0
        if is_member:
            return True
        collaboration = db.session.get(Collaboration, collaboration_id)
        if not collaboration:
            return False
        return has_org_manager_unit_access(user_id, collaboration)

    confirm_write_access(override_func=override_func)


def is_service_admin(service_id=None):
    user_id = current_user_id()
    query = ServiceMembership.query \
        .options(load_only(ServiceMembership.user_id)) \
        .filter(ServiceMembership.user_id == user_id) \
        .filter(ServiceMembership.role == "admin")
    if service_id:
        query = query.filter(ServiceMembership.service_id == service_id)
    return query.count() > 0


def is_service_admin_or_manager(service_id=None):
    user_id = current_user_id()
    query = ServiceMembership.query \
        .options(load_only(ServiceMembership.user_id)) \
        .filter(ServiceMembership.user_id == user_id)
    if service_id:
        query = query.filter(ServiceMembership.service_id == service_id)
    return query.count() > 0


def confirm_service_admin(service_id=None):
    def override_func():
        return is_service_admin(service_id)

    confirm_write_access(override_func=override_func)


def confirm_service_manager(service_id=None):
    def override_func():
        return is_service_admin_or_manager(service_id)

    confirm_write_access(override_func=override_func)
