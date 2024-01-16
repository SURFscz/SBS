import os
import uuid

from flask import Blueprint
from flask import request as current_request, session
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint
from server.auth.secrets import generate_token
from server.auth.security import is_admin_user, CSRF_TOKEN
from server.auth.user_claims import add_user_claims
from server.db.db import db
from server.db.domain import User
from server.tools import dt_now

mock_user_api = Blueprint("mock_user_api", __name__, url_prefix="/api/mock")


@mock_user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def login_user():
    if not os.environ.get("ALLOW_MOCK_USER_API", None):
        raise Forbidden()

    data = current_request.get_json()
    sub = data["sub"]  # oidc sub maps to sbs uid - see user_claims
    user = User.query.filter(User.uid == sub).first() or User(created_by="system", updated_by="system",
                                                              external_id=str(uuid.uuid4()))
    user.last_login_date = dt_now()
    add_user_claims(data, sub, user)
    db.session.merge(user)

    res = {"admin": is_admin_user(user), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "user_accepted_aup": user.has_agreed_with_aup(),
        "second_factor_confirmed": data.get("second_factor_confirmed", True)
    }
    session["user"] = {**session_data, **res}
    if CSRF_TOKEN not in session:
        session[CSRF_TOKEN] = generate_token()
    return None, 201
