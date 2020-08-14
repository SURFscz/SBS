# -*- coding: future_fstrings -*-

from flask import Blueprint, current_app

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access

system_api = Blueprint("system_api", __name__, url_prefix="/api/system")


@system_api.route("/suspend_users", strict_slashes=False, methods=["PUT"])
@json_endpoint
def suspend_users_endpoint():
    confirm_write_access()

    from server.cron.schedule import suspend_users

    return suspend_users(current_app), 201
