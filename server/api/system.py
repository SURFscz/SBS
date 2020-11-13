# -*- coding: future_fstrings -*-

from flask import Blueprint, current_app
from sqlalchemy import text
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.audit_mixin import metadata
from server.db.db import db
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

    return {}, 200
