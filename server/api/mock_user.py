# -*- coding: future_fstrings -*-
import datetime
import os

from flask import Blueprint
from flask import request as current_request, session
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint
from server.auth.security import is_admin_user
from server.auth.user_claims import add_user_claims
from server.db.db import db
from server.db.domain import User

mock_user_api = Blueprint("mock_user_api", __name__, url_prefix="/api/mock")


@mock_user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def login_user():
    if not os.environ.get("ALLOW_MOCK_USER_API", None):
        raise Forbidden()

    data = current_request.get_json()
    sub = data["sub"]  # oidc sub maps to sbs uid - see user_claims
    user = User.query.filter(User.uid == sub).first() or User(created_by="system", updated_by="system")
    user.last_login_date = datetime.datetime.now()
    add_user_claims(data, sub, user, replace_none_values=False)
    db.session.merge(user)

    res = {"admin": is_admin_user(user), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "user_accepted_aup": user.has_agreed_with_aup(),
        "second_factor_confirmed": True
    }
    session["user"] = {**session_data, **res}
    return None, 201
