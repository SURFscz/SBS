from flask import Blueprint, request as current_request
from sqlalchemy import desc, or_, and_
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint, query_param
from server.auth.security import current_user_id, confirm_allow_impersonation, confirm_write_access, \
    is_organisation_admin_or_manager, is_collaboration_admin, access_allowed_to_collaboration_as_org_member, \
    has_org_manager_unit_access
from server.db.audit_mixin import AuditLog
from server.db.domain import User, Organisation, Collaboration, Service

audit_log_api = Blueprint("audit_log_api", __name__, url_prefix="/api/audit_logs")

table_names_cls_mapping = {
    "organisations": Organisation,
    "collaborations": Collaboration,
    "services": Service,
}


def _user_activity(user_id):
    filter_params = ((AuditLog.target_id == user_id) & (AuditLog.target_type == User.__tablename__)) | (
            AuditLog.subject_id == user_id)  # noqa: E126
    audit_logs = AuditLog.query \
        .filter(filter_params) \
        .order_by(desc(AuditLog.created_at)) \
        .all()
    return _add_references(audit_logs), 200


@audit_log_api.route("/me", methods=["GET"], strict_slashes=False)
@json_endpoint
def me():
    headers = current_request.headers
    user_id = current_user_id()
    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    if impersonate_id:
        confirm_allow_impersonation(confirm_feature_impersonation_allowed=False)

    return _user_activity(user_id)


@audit_log_api.route("/other/<user_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def other(user_id):
    confirm_write_access()
    return _user_activity(user_id)


@audit_log_api.route("/activity", methods=["GET"], strict_slashes=False)
@json_endpoint
def activity():
    confirm_write_access()

    tables = list(filter(lambda s: s.strip(), query_param("tables", False, "").split(",")))
    query = AuditLog.query.order_by(desc(AuditLog.created_at))
    if tables:
        query = query.filter(AuditLog.target_type.in_(tables))
    q = query_param("query", False, None)
    if q and len(q.strip()) > 0:
        wildcard = f"%{q}%"
        conditions = [AuditLog.target_type.ilike(wildcard),
                      AuditLog.target_name.ilike(wildcard),
                      AuditLog.state_after.ilike(wildcard),
                      AuditLog.state_before.ilike(wildcard)]
        query = query.filter(or_(*conditions))

    limit = int(query_param("limit", False, 50))
    query = query.limit(limit)

    audit_logs = query.all()
    return _add_references(audit_logs), 200


@audit_log_api.route("/info/<query_id>/<collection_name>", methods=["GET"], strict_slashes=False)
@json_endpoint
def info(query_id, collection_name):
    def override_func():
        user_id = current_user_id()
        if collection_name == "organisations":
            return is_organisation_admin_or_manager(query_id)
        if collection_name == "collaborations":
            co_admin = is_collaboration_admin(user_id=user_id, collaboration_id=query_id)
            if co_admin:
                return True
            collaboration = Collaboration.query.filter(Collaboration.id == query_id).one()
            return has_org_manager_unit_access(user_id, collaboration)
        return False

    confirm_write_access(override_func=override_func)

    audit_logs = AuditLog.query \
        .filter(or_(and_(AuditLog.parent_id == query_id, AuditLog.parent_name == collection_name),
                    and_(AuditLog.target_id == query_id, AuditLog.target_type == collection_name))) \
        .order_by(desc(AuditLog.created_at)) \
        .all()

    def access_collaboration_allowed(audit_log):
        if audit_log.target_type != "collaborations":
            return True
        collaboration = Collaboration.query.filter(Collaboration.id == audit_log.target_id).one()
        return has_org_manager_unit_access(current_user_id(), collaboration)

    if collection_name == "organisations":
        audit_logs = list(filter(access_collaboration_allowed, audit_logs))

    res = _add_references(audit_logs)

    return res, 200


def _contains_id(result, key, id):
    return any(elem.id == id for elem in result.get(key)) if key in result else False


def _add_references(audit_logs):
    result = {"audit_logs": audit_logs}
    for audit_log in audit_logs:
        parent_name = audit_log.parent_name
        if parent_name in table_names_cls_mapping and not _contains_id(result, parent_name, audit_log.parent_id):
            cls = table_names_cls_mapping[parent_name]
            parents = cls.query.options(load_only(cls.id, cls.name)).filter(cls.id == audit_log.parent_id).all()
            result[parent_name] = result.get(parent_name, []) + parents

        if audit_log.user_id or audit_log.subject_id:
            if not _contains_id(result, "users", audit_log.user_id):
                users = User.query.filter(User.id == audit_log.user_id).all()
                result["users"] = result.get("users", []) + users
            if not _contains_id(result, "users", audit_log.subject_id):
                users = User.query.filter(User.id == audit_log.subject_id).all()
                result["users"] = result.get("users", []) + users
    return result
