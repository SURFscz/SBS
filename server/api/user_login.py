from flask import Blueprint
from sqlalchemy import text

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access
from server.db.db import db
from server.db.defaults import USER_TOKEN_INTROSPECT, PAM_WEB_LOGIN, PROXY_AUTHZ_SBS, PROXY_AUTHZ, SBS_LOGIN

user_login_api = Blueprint("user_login_api", __name__, url_prefix="/api/user_logins")


@user_login_api.route("/summary", methods=["GET"], strict_slashes=False)
@json_endpoint
def summary():
    confirm_write_access()
    with db.engine.connect() as conn:
        rs = conn.execute(text("SELECT login_type, COUNT(*), SUM(succeeded=1), SUM(succeeded=0) "
                               "FROM user_logins GROUP BY login_type"))
        res = [{"login_type": row[0], "count": row[1], "succeeded": int(row[2]), "failed": int(row[3])} for row in rs]

    for login_type in [SBS_LOGIN, PROXY_AUTHZ, PROXY_AUTHZ_SBS, PAM_WEB_LOGIN, USER_TOKEN_INTROSPECT]:
        if not [r for r in res if r["login_type"] == login_type]:
            res.append({"login_type": login_type, "count": 0, "succeeded": 0, "failed": 0})
    return res, 200
