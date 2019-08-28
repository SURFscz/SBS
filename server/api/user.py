# -*- coding: future_fstrings -*-
import itertools
import json
import os
import subprocess
import tempfile

from flask import Blueprint, request as current_request, session, jsonify
from sqlalchemy import text, or_
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars, ctx_logger
from server.auth.security import confirm_allow_impersonation, is_admin_user, current_user_id, confirm_read_access
from server.auth.user_claims import claim_attribute_hash_headers, claim_attribute_hash_user, add_user_claims, \
    get_user_uid
from server.db.db import User, OrganisationMembership, CollaborationMembership, db
from server.db.defaults import full_text_search_autocomplete_limit
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
    is_admin = {"admin": is_admin_user(user.uid), "guest": False}
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


def _user_json_response(user):
    is_admin = {"admin": is_admin_user(user.uid), "guest": False}
    json_user = jsonify(user).json
    return {**json_user, **is_admin}, 200


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
    if q != "*":
        q = replace_full_text_search_boolean_mode_chars(q)
        base_query += f"AND MATCH (u.name, u.email) AGAINST ('{q}*' IN BOOLEAN MODE) " \
            f"AND u.id > 0 "

    if organisation_id:
        base_query += f"AND om.organisation_id = {organisation_id} "

    if collaboration_id:
        base_query += f"AND cm.collaboration_id = {collaboration_id} "

    if organisation_admins:
        base_query += f"AND om.role = 'admin'"

    if collaboration_admins:
        base_query += f"AND cm.role = 'admin'"

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
            user_info["admin"] = is_admin_user(g["uid"])
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
    request_headers = current_request.environ.copy()
    request_headers.update(current_request.headers)
    uid = get_user_uid(request_headers)
    if uid:
        users = User.query.filter(User.uid == uid).all()
        user = users[0] if len(users) > 0 else None
        logger = ctx_logger("user")
        if not user:
            user = User(uid=uid, created_by="system", updated_by="system")
            add_user_claims(request_headers, uid, user)
            logger.info(f"Provisioning new user {user.uid}")
            user = db.session.merge(user)
            db.session.commit()
        else:
            hash_headers = claim_attribute_hash_headers(request_headers)
            hash_user = claim_attribute_hash_user(user)
            if hash_user != hash_headers:
                logger.info(f"Updating user {user.uid} with new claims")
                add_user_claims(request_headers, uid, user)
                user = db.session.merge(user)
                db.session.commit()
            else:
                logger.info(f"Not updating user {user.uid} as the claims are not changed")

        is_admin = _store_user_in_session(user)

        for organisation_membership in user.organisation_memberships:
            organisation_membership.organisation
        for collaboration_membership in user.collaboration_memberships:
            collaboration_membership.collaboration

        user = {**jsonify(user).json, **is_admin}
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

    is_member_of = []

    for collaboration_membership in user.collaboration_memberships:
        is_member_of.append(collaboration_membership.collaboration.name)
        for authorisation_group in collaboration_membership.authorisation_groups:
            is_member_of.append(authorisation_group.short_name)

    return is_member_of, 200


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    ctx_logger("user").exception(json.dumps(current_request.json))
    return {}, 201
