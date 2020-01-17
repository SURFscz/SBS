# -*- coding: future_fstrings -*-
from flask import Blueprint
from sqlalchemy import desc
from server.api.base import json_endpoint
from server.auth.security import current_user_id, confirm_read_access, confirm_group_member, \
    is_organisation_admin, is_current_user_collaboration_admin, is_current_user_organisation_admin
from server.db.audit_mixin import AuditLog
from server.db.domain import User, Organisation, Collaboration, Group

audit_log_api = Blueprint("audit_log_api", __name__, url_prefix="/api/audit_logs")

table_names_cls_mapping = {
    "organisations": Organisation,
    "collaborations": Collaboration,
}


@audit_log_api.route("/me", methods=["GET"], strict_slashes=False)
@json_endpoint
def me():
    user_id = current_user_id()
    audit_logs = AuditLog.query \
        .filter((
                    (AuditLog.target_id == user_id) & (AuditLog.target_type == User.__tablename__)) | (
                    AuditLog.subject_id == user_id)) \
        .order_by(desc(AuditLog.created_at)) \
        .limit(100) \
        .all()
    return _add_references(audit_logs), 200


@audit_log_api.route("/info/<query_id>/<collection_name>", methods=["GET"], strict_slashes=False)
@json_endpoint
def info(query_id, collection_name):
    def groups_permission(group_id):
        coll_id = Group.query.get(group_id).collaboration_id
        return confirm_group_member(group_id) or is_current_user_collaboration_admin(
            coll_id) or is_current_user_organisation_admin(coll_id)

    def collaboration_permission(collaboration_id):
        return is_current_user_collaboration_admin(collaboration_id) or is_current_user_organisation_admin(
            collaboration_id)

    override_func = collaboration_permission if collection_name == "collaborations" \
        else groups_permission if collection_name == "groups" \
        else is_organisation_admin if collection_name == "organisations" else None
    confirm_read_access(query_id, override_func=override_func)

    audit_logs = AuditLog.query \
        .filter((AuditLog.parent_id == query_id) | (AuditLog.target_id == query_id)) \
        .order_by(desc(AuditLog.created_at)) \
        .limit(100) \
        .all()

    return _add_references(audit_logs), 200


def _contains_id(result, key, id):
    return any(elem.id == id for elem in result.get(key)) if key in result else False


def _add_references(audit_logs):
    result = {"audit_logs": audit_logs}
    for audit_log in audit_logs:
        parent_name = audit_log.parent_name
        if parent_name in table_names_cls_mapping and not _contains_id(result, parent_name, audit_log.parent_id):
            cls = table_names_cls_mapping[parent_name]
            parents = cls.query.filter(cls.id == audit_log.parent_id).all()
            result[parent_name] = result.get(parent_name, []) + parents

        if audit_log.user_id or audit_log.subject_id:
            if not _contains_id(result, "users", audit_log.user_id):
                users = User.query.filter(User.id == audit_log.user_id).all()
                result["users"] = result.get("users", []) + users
            if not _contains_id(result, "users", audit_log.subject_id):
                users = User.query.filter(User.id == audit_log.subject_id).all()
                result["users"] = result.get("users", []) + users
    return result
