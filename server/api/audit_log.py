# -*- coding: future_fstrings -*-
from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import current_user_id
from server.db.audit_mixin import AuditLog
from server.db.domain import User

audit_log_api = Blueprint("audit_log_api", __name__, url_prefix="/api/audit_logs")


@audit_log_api.route("/me", methods=["GET"], strict_slashes=False)
@json_endpoint
def me():
    user_id = current_user_id()
    return AuditLog.query \
               .filter(AuditLog.subject_id == user_id) \
               .all(), 200


@audit_log_api.route("/profile", methods=["GET"], strict_slashes=False)
@json_endpoint
def profile():
    user_id = current_user_id()
    return AuditLog.query \
               .filter(AuditLog.target_id == user_id) \
               .filter(AuditLog.target_type == User.__tablename__) \
               .all(), 200
