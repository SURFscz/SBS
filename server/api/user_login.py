# -*- coding: future_fstrings -*-

from flask import Blueprint

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.db import db

user_login_api = Blueprint("user_login_api", __name__, url_prefix="/api/user_logins")


@user_login_api.route("/summary", methods=["GET"], strict_slashes=False)
@json_endpoint
def summary():
    confirm_write_access()

    rs = db.engine.execute("SELECT COUNT(*) AS c, COUNT(DISTINCT(user_id)) AS cu, "
                           "COUNT(DISTINCT(service_id)) AS cs FROM user_logins")
    results = next(rs)

    return dict(results), 200
