# -*- coding: future_fstrings -*-
import datetime
import itertools
import json
import os
import random
import re
import string
import subprocess
import tempfile
import unicodedata

from flask import Blueprint, request as current_request, session, jsonify, current_app, redirect
from sqlalchemy import text, or_, bindparam, String
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars, ctx_logger
from server.auth.security import confirm_allow_impersonation, is_admin_user, current_user_id, confirm_read_access, \
    confirm_collaboration_admin, confirm_organisation_admin
from server.auth.user_claims import add_user_claims, \
    get_user_uid, get_user_eppn
from server.cron.schedule import create_suspend_notification
from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import User, OrganisationMembership, CollaborationMembership
from server.db.models import update

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


def _log_headers():
    logger = ctx_logger("user")
    for k, v in current_request.environ.items():
        logger.debug(f"ENV {k} value {v}")
    for k, v in current_request.headers.items():
        logger.debug(f"Header {k} value {v}")
    for k, v in os.environ.items():
        logger.debug(f"OS environ {k} value {v}")


def _store_user_in_session(user):
    # The session is stored as a cookie in the browser. We therefore minimize the content
    res = {"admin": is_admin_user(user), "guest": False, "confirmed_admin": user.confirmed_super_user}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email
    }
    session["user"] = {**session_data, **res}
    return res


def _user_query():
    return User.query \
        .outerjoin(User.aups) \
        .outerjoin(User.organisation_memberships) \
        .outerjoin(OrganisationMembership.organisation) \
        .outerjoin(User.collaboration_memberships) \
        .outerjoin(CollaborationMembership.collaboration) \
        .options(contains_eager(User.aups)) \
        .options(contains_eager(User.organisation_memberships)
                 .contains_eager(OrganisationMembership.organisation)) \
        .options(contains_eager(User.collaboration_memberships)
                 .contains_eager(CollaborationMembership.collaboration))


def _user_json_response(user):
    is_admin = {"admin": is_admin_user(user), "guest": False, "confirmed_admin": user.confirmed_super_user}
    json_user = jsonify(user).json
    needs_to_agree_with_aup = \
        current_app.app_config.aup.pdf not in list(map(lambda aup: aup.au_version, user.aups))
    return {**json_user, **is_admin, **{"needs_to_agree_with_aup": needs_to_agree_with_aup}}, 200


def _normalize(s):
    if s is None:
        return ""
    normalized = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("utf-8").strip()
    return re.sub("[^a-zA-Z]", "", normalized)


def generate_unique_username(user: User, max_count=10000):
    username = f"{_normalize(user.given_name)[0:1]}{_normalize(user.family_name)[0:11]}"[0:10].lower()
    if len(username) == 0:
        username = "u"
    counter = 2
    generated_user_name = username
    while True and counter < max_count:
        if User.query.filter(User.username == generated_user_name).count() == 0:
            return generated_user_name
        generated_user_name = f"{username}{counter}"
        counter = counter + 1
    # Try remembering that...
    return "".join(random.sample(string.ascii_lowercase, k=14))


@user_api.route("/search", strict_slashes=False)
@json_endpoint
def user_search():
    confirm_allow_impersonation()

    q = query_param("q")
    organisation_id = query_param("organisation_id", required=False)
    collaboration_id = query_param("collaboration_id", required=False)
    organisation_admins = query_param("organisation_admins", required=False)
    collaboration_admins = query_param("collaboration_admins", required=False)

    base_query = "SELECT u.id, u.uid, u.name, u.email, o.name, om.role, c.name, cm.role  FROM users u "

    organisation_join = " INNER " if organisation_id or organisation_admins else "LEFT "
    base_query += f"{organisation_join} JOIN organisation_memberships om ON om.user_id = u.id " \
                  f"{organisation_join} JOIN organisations o ON o.id = om.organisation_id "

    collaboration_join = " INNER " if collaboration_id or collaboration_admins else "LEFT "
    base_query += f"{collaboration_join} JOIN collaboration_memberships cm ON cm.user_id = u.id " \
                  f"{collaboration_join} JOIN collaborations c ON c.id = cm.collaboration_id "

    base_query += " WHERE 1=1 "
    not_wild_card = q != "*"
    if not_wild_card:
        q = replace_full_text_search_boolean_mode_chars(q)
        base_query += "AND MATCH (u.name, u.email) AGAINST (:q IN BOOLEAN MODE) " \
                      "AND u.id > 0 "

    if organisation_id:
        base_query += f"AND om.organisation_id = {int(organisation_id)} "

    if collaboration_id:
        base_query += f"AND cm.collaboration_id = {int(collaboration_id)} "

    if organisation_admins:
        base_query += "AND om.role = 'admin'"

    if collaboration_admins:
        base_query += "AND cm.role = 'admin'"

    base_query += f" ORDER BY u.name  LIMIT {full_text_search_autocomplete_limit}"

    sql = text(base_query)

    if not_wild_card:
        sql = sql.bindparams(bindparam("q", type_=String))
    result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)
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
            user_info["admin"] = is_admin_user(g)
            if g["organisation_name"] is not None and g["organisation_name"] not in [item["name"] for item in
                                                                                     user_info["organisations"]]:
                user_info["organisations"].append({"name": g["organisation_name"], "role": g["organisation_role"]})
            if g["collaboration_name"] is not None and g["collaboration_name"] not in [item["name"] for item in
                                                                                       user_info["collaborations"]]:
                user_info["collaborations"].append({"name": g["collaboration_name"], "role": g["collaboration_role"]})
        res.append(user_info)
    return res, 200


def _user_name(user):
    user.username = generate_unique_username(user)
    return user


def _current_request_headers():
    request_headers = current_request.environ.copy()
    request_headers.update(current_request.headers)
    return request_headers


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    request_headers = _current_request_headers()
    uid = get_user_uid(request_headers)
    if uid:
        users = User.query.filter(User.uid == uid).all()
        user = users[0] if len(users) > 0 else None
        logger = ctx_logger("user")
        if not user:
            user = User(uid=uid, created_by="system", updated_by="system")
            add_user_claims(request_headers, uid, user)
            user = _user_name(user)
            # last_login_date is set later in this method
            user.last_accessed_date = datetime.datetime.now()
            logger.info(f"Provisioning new user {user.uid}")
        else:
            if user.suspended:
                logger.info(
                    f"Returning error for user {uid} as user is suspended")
                return {"error": f"user {uid} is suspended"}, 409

            if not user.username:
                user = _user_name(user)
                logger.info(f"Updating user {user.uid} with new username {user.username}")
            logger.info(f"Updating user {user.uid} with new claims / updated at")
            add_user_claims(request_headers, uid, user)

        user.last_login_date = datetime.datetime.now()

        suspend_notifications_count = len(user.suspend_notifications)

        user.suspend_notifications = []
        user = db.session.merge(user)
        db.session.commit()

        is_admin = _store_user_in_session(user)

        for organisation_membership in user.organisation_memberships:
            organisation_membership.organisation
        for collaboration_membership in user.collaboration_memberships:
            collaboration_membership.collaboration
        user.aups
        user = {**jsonify(user).json, **is_admin}
        user["needs_to_agree_with_aup"] = \
            current_app.app_config.aup.pdf not in list(map(lambda aup: aup["au_version"], user["aups"]))
        user["successfully_activated"] = suspend_notifications_count > 0
    else:
        user = {"uid": "anonymous", "guest": True, "admin": False}
        session["user"] = user

    _log_headers()

    return user, 200


@user_api.route("/refresh", strict_slashes=False)
@json_endpoint
def refresh():
    user_id = current_user_id()
    user = _user_query().filter(User.id == user_id).one()
    return _user_json_response(user)


@user_api.route("/activate", methods=["PUT"], strict_slashes=False)
@json_endpoint
def activate():
    body = current_request.get_json()
    if "collaboration_id" in body:
        confirm_collaboration_admin(body["collaboration_id"])
    else:
        confirm_organisation_admin(body["organisation_id"])
    user = User.query.get(body["user_id"])

    user.suspended = False
    retention = current_app.app_config.retention
    user.last_login_date = datetime.datetime.now() - datetime.timedelta(days=retention.allowed_inactive_period_days)
    user.suspend_notifications = []
    db.session.merge(user)

    create_suspend_notification(user, retention, current_app, True)
    return {}, 201


@user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user():
    headers = current_request.headers
    user_id = current_request.get_json()["id"]

    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    if impersonate_id:
        confirm_allow_impersonation()
    else:
        if user_id != current_user_id():
            raise Forbidden()

    user = User.query.get(user_id)
    custom_json = jsonify(user).json
    user_json = current_request.get_json()
    for attr in ["ssh_key", "ubi_key", "tiqr_key", "totp_key"]:
        custom_json[attr] = user_json.get(attr)

    if "ssh_key" in user_json:
        if "convertSSHKey" in user_json and user_json["convertSSHKey"]:
            ssh_key = user_json["ssh_key"]
            if ssh_key and ssh_key.startswith("---- BEGIN SSH2 PUBLIC KEY ----"):
                with tempfile.NamedTemporaryFile() as f:
                    f.write(ssh_key.encode())
                    f.flush()
                    res = subprocess.run(["ssh-keygen", "-i", "-f", f.name], stdout=subprocess.PIPE)
                    if res.returncode == 0:
                        custom_json["ssh_key"] = res.stdout.decode()

    return update(User, custom_json=custom_json, allow_child_cascades=False)


@user_api.route("/other", strict_slashes=False)
@json_endpoint
def other():
    confirm_allow_impersonation()

    uid = query_param("uid")
    user = _user_query().filter(User.uid == uid).one()
    return _user_json_response(user)


@user_api.route("/attribute_aggregation", strict_slashes=False)
@json_endpoint
# End point used by the SBS attribute aggregator in the github.com:OpenConext/OpenConext-attribute-aggregation project
def attribute_aggregation():
    confirm_read_access()

    edu_person_principal_name = query_param("edu_person_principal_name")
    email = query_param("email", required=False)

    users = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .options(contains_eager(User.collaboration_memberships)
                 .contains_eager(CollaborationMembership.collaboration)) \
        .filter(or_(User.uid == edu_person_principal_name,
                    User.email == email)) \
        .all()

    # preference over edu_person_principal_name
    if len(users) == 0:
        return None, 404

    users_eppn_match = list(filter(lambda u: u.uid == edu_person_principal_name, users))
    user = users[0] if len(users) == 1 else users_eppn_match[0] if len(users_eppn_match) == 1 else users[0]

    return [cm.collaboration.name for cm in user.collaboration_memberships], 200


@user_api.route("/upgrade_super_user", methods=["GET"], strict_slashes=False)
def upgrade_super_user():
    session.modified = True
    request_headers = _current_request_headers()

    eppn = get_user_eppn(request_headers)
    user = User.query.filter(User.application_uid == eppn).one()

    if not is_admin_user(user):
        raise Forbidden("Must be admin user")

    user.confirmed_super_user = True
    user = db.session.merge(user)
    db.session.commit()

    _store_user_in_session(user)

    response = redirect(current_app.app_config.feature.admin_users_upgrade_redirect_url)
    response.headers.set("x-session-alive", "true")
    response.headers["server"] = ""
    return response


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    ctx_logger("user").exception(json.dumps(current_request.json))
    return {}, 201
