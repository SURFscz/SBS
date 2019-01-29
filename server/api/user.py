import itertools
import json
import logging
import os

from flask import Blueprint, request as current_request, session, current_app, jsonify
from sqlalchemy import text
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.api.security import confirm_is_application_admin
from server.db.db import User, OrganisationMembership, CollaborationMembership, db
from server.db.defaults import full_text_search_autocomplete_limit

UID_HEADER_NAME = "MELLON_cmuid"

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


# Temp code
def _log_headers():
    headers = current_request.headers
    for k, v in headers.items():
        current_app.logger.info(f"Header {k} value {v}")
    for k, v in os.environ.items():
        current_app.logger.info(f"OS environ {k} value {v}")


def _is_admin_user(uid):
    return len(list(filter(lambda u: u.uid == uid, current_app.app_config.admin_users))) == 1


def _store_user_in_session(user):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    is_admin = {"admin": _is_admin_user(user.uid), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email
    }
    session["user"] = {**session_data, **is_admin}
    return is_admin


def _user_query():
    return User.query \
        .outerjoin(User.organisation_memberships) \
        .outerjoin(OrganisationMembership.organisation) \
        .outerjoin(User.collaboration_memberships) \
        .outerjoin(CollaborationMembership.collaboration) \
        .options(contains_eager(User.organisation_memberships)
                 .contains_eager(OrganisationMembership.organisation)) \
        .options(contains_eager(User.collaboration_memberships)
                 .contains_eager(CollaborationMembership.collaboration))


@user_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    organisation_id = current_request.args.get("organisation_id", None)
    collaboration_id = current_request.args.get("collaboration_id", None)

    base_query = "SELECT u.id, u.uid, u.name, u.email, o.name, om.role, c.name, cm.role  FROM users u "

    organisation_join = " INNER " if organisation_id else "LEFT "
    base_query += f"{organisation_join} JOIN organisation_memberships om ON om.user_id = u.id " \
        f"{organisation_join} JOIN organisations o ON o.id = om.organisation_id "

    collaboration_join = " INNER " if collaboration_id else "LEFT "
    base_query += f"{collaboration_join} JOIN collaboration_memberships cm ON cm.user_id = u.id " \
        f"{collaboration_join} JOIN collaborations c ON c.id = cm.collaboration_id "

    base_query += " WHERE 1=1 "
    if q != "*":
        base_query += f"AND MATCH (u.name, u.email) AGAINST ('{q}*' IN BOOLEAN MODE) " \
            f"AND u.id > 0 "

    if organisation_id:
        base_query += f"AND om.organisation_id = {organisation_id} "

    if collaboration_id:
        base_query += f"AND cm.collaboration_id = {collaboration_id} "

    base_query += f" ORDER BY u.id  LIMIT {full_text_search_autocomplete_limit}"
    sql = text(base_query)
    result_set = db.engine.execute(sql)
    data = [{"id": row[0], "uid": row[1], "name": row[2], "email": row[3], "organisation_name": row[4],
             "organisation_role": row[5], "collaboration_name": row[6],
             "collaboration_role": row[7]} for row in result_set]

    res = []
    for key, group in itertools.groupby(data, lambda u: u["id"]):
        user_info = {"id": key, "organisations": [], "collaborations": []}
        for g in group:
            user_info["uid"] = g["uid"]
            user_info["name"] = g["name"]
            user_info["email"] = g["email"]
            user_info["admin"] = _is_admin_user(g["uid"])
            if g["organisation_name"] is not None and g["organisation_name"] not in [item["name"] for item in
                                                                                     user_info["organisations"]]:
                user_info["organisations"].append({"name": g["organisation_name"], "role": g["organisation_role"]})
            if g["collaboration_name"] is not None and g["collaboration_name"] not in [item["name"] for item in
                                                                                       user_info["collaborations"]]:
                user_info["collaborations"].append({"name": g["collaboration_name"], "role": g["collaboration_role"]})
        res.append(user_info)
    return res, 200


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    _log_headers()

    uid = current_request.headers.get(UID_HEADER_NAME)
    if uid:
        users = _user_query().filter(User.uid == uid).all()
        user = users[0] if len(users) > 0 else None
        if not user:
            user = User(uid=uid, name="todo", email="todo", created_by="system", updated_by="system")
            user = db.session.merge(user)
            db.session.commit()

        is_admin = _store_user_in_session(user)
        json_user = jsonify(user).json
        user = {**json_user, **is_admin}
    else:
        user = {"uid": "anonymous", "guest": True, "admin": False}
        session["user"] = user
    return user, 200


@user_api.route("/other", strict_slashes=False)
@json_endpoint
def other():
    confirm_is_application_admin()

    uid = current_request.args.get("uid")
    return _user_query().filter(User.uid == uid).one(), 200


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    logging.getLogger().exception(json.dumps(current_request.json))
    return {}, 201
