# -*- coding: future_fstrings -*-

from flask import Blueprint, current_app
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.audit_mixin import metadata
from server.db.db import db

system_api = Blueprint("system_api", __name__, url_prefix="/api/system")


@system_api.route("/suspend_users", strict_slashes=False, methods=["PUT"])
@json_endpoint
def suspend_users_endpoint():
    confirm_write_access()

    from server.cron.schedule import suspend_users

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
