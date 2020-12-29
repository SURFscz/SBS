# -*- coding: future_fstrings -*-

from flask import current_app, Blueprint, request as current_request
from sqlalchemy import text
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access, current_user_id
from server.db.audit_mixin import metadata
from server.db.db import db
from server.db.domain import User
from server.mail import mail_feedback
from server.test.seed import seed

system_api = Blueprint("system_api", __name__, url_prefix="/api/system")


@system_api.route("/suspend_users", strict_slashes=False, methods=["PUT"])
@json_endpoint
def suspend_users_endpoint():
    confirm_write_access()

    from server.cron.user_suspending import suspend_users

    return suspend_users(current_app), 201


@system_api.route("/db_stats", strict_slashes=False, methods=["GET"])
@json_endpoint
def db_stats():
    confirm_write_access()

    results = []
    tables = list(map(lambda t: str(t.name), metadata.sorted_tables))
    tables.append("audit_logs")
    for table in tables:
        rows = db.session.execute(text(f"SELECT COUNT(*) FROM `{table}`"))
        for row in rows:
            results.append({"name": table, "count": row[0]})

    return sorted(results, key=lambda k: k["count"], reverse=True), 200


@system_api.route("/seed", strict_slashes=False, methods=["GET"])
@json_endpoint
def run_seed():
    confirm_write_access()

    if not current_app.app_config.feature.seed_allowed:
        raise BadRequest("seed not allowed in this environment")

    seed(db, current_app.app_config)

    return {}, 201


@system_api.route("/clear-audit-logs", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def clear_audit_logs():
    confirm_write_access()

    if not current_app.app_config.feature.seed_allowed:
        raise BadRequest("clear-audit-logs not allowed in this environment")

    db.session.execute(text("DELETE FROM audit_logs"))
    return {}, 201


@system_api.route("/feedback", strict_slashes=False, methods=["POST"])
@json_endpoint
def feedback():
    cfg = current_app.app_config
    if not cfg.feature.feedback_enabled:
        raise BadRequest("feedback is not enabled")

    data = current_request.get_json()
    message = data["message"]
    mail_conf = cfg.mail
    user = User.query.get(current_user_id())
    mail_feedback(mail_conf.environment, message, user, [mail_conf.info_email])
    return {}, 201
