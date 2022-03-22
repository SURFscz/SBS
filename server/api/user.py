# -*- coding: future_fstrings -*-
import datetime
import itertools
import json
import os
import subprocess
import tempfile
import unicodedata
import urllib.parse
import uuid

import requests
from flask import Blueprint, current_app, redirect
from flask import request as current_request, session, jsonify
from sqlalchemy import text, or_, bindparam, String
from sqlalchemy.orm import joinedload, selectinload
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param
from server.api.base import replace_full_text_search_boolean_mode_chars
from server.api.ipaddress import validate_ip_networks
from server.auth.mfa import ACR_VALUES, decode_jwt_token, store_user_in_session, mfa_idp_allowed
from server.auth.security import confirm_allow_impersonation, is_admin_user, current_user_id, confirm_read_access, \
    confirm_collaboration_admin, confirm_organisation_admin, current_user, confirm_write_access
from server.auth.user_claims import add_user_claims
from server.cron.user_suspending import create_suspend_notification
from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import User, OrganisationMembership, CollaborationMembership, JoinRequest, CollaborationRequest, \
    UserNameHistory, SshKey, Organisation, Collaboration, Service, ServiceMembership, ServiceAup, UserIpNetwork
from server.logger.context_logger import ctx_logger
from server.mail import mail_error, mail_account_deletion

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


def _add_counts(user: dict):
    if is_admin_user(user):
        platform_admins = User.query.filter(User.uid.in_([u.uid for u in current_app.app_config.admin_users])).count()
        user["total_platform_admins"] = platform_admins
        user["total_organisations"] = Organisation.query.count()
        user["total_collaborations"] = Collaboration.query.count()
        user["total_services"] = Service.query.count()
        user["total_users"] = User.query.count()


def _add_service_aups(user: dict, user_from_db: User):
    # Find all services available for this user and then see if there are missing ServiceAup's
    services = []
    for cm in user_from_db.collaboration_memberships:
        services += [s for s in cm.collaboration.services] + [s for s in cm.collaboration.organisation.services]

    service_identifiers = [aup.service_id for aup in user_from_db.service_aups]

    missing_services = [s for s in services if s.id not in service_identifiers and s.accepted_user_policy]
    unique_missing_services = list({s.id: s for s in missing_services}.values())

    service_emails = {}
    for s in unique_missing_services:
        service_emails[s.id] = [s.contact_email] if s.contact_email else [m.user.email for m in s.service_memberships]

    user["services_without_aup"] = jsonify(unique_missing_services).json
    user["service_emails"] = jsonify(service_emails).json
    if unique_missing_services:
        collaborations = []
        for cm in user_from_db.collaboration_memberships:
            for service in unique_missing_services:
                collaboration = cm.collaboration
                if service.id in [s.id for s in collaboration.services]:
                    collaborations.append(
                        {"id": collaboration.id, "name": collaboration.name, "description": collaboration.description})
        user["service_collaborations"] = jsonify(list({c["id"]: c for c in collaborations}.values())).json


def _user_query():
    return User.query \
        .options(joinedload(User.organisation_memberships)
                 .subqueryload(OrganisationMembership.organisation)) \
        .options(joinedload(User.collaboration_memberships)
                 .subqueryload(CollaborationMembership.collaboration)) \
        .options(joinedload(User.service_memberships)
                 .subqueryload(ServiceMembership.service)) \
        .options(joinedload(User.join_requests)
                 .subqueryload(JoinRequest.collaboration)) \
        .options(joinedload(User.aups)) \
        .options(joinedload(User.collaboration_requests)
                 .subqueryload(CollaborationRequest.organisation))


def _user_json_response(user, auto_set_second_factor_confirmed):
    second_factor_confirmed = auto_set_second_factor_confirmed or session["user"]["second_factor_confirmed"]
    is_admin = {"admin": is_admin_user(user),
                "second_factor_confirmed": second_factor_confirmed,
                "user_accepted_aup": user.has_agreed_with_aup(),
                "guest": False,
                "confirmed_admin": user.confirmed_super_user}
    json_user = jsonify(user).json
    _add_counts(json_user)
    _add_service_aups(json_user, user)
    return {**json_user, **is_admin}, 200


def _get_authorization_url(state=None):
    oidc_config = current_app.app_config.oidc
    if state:
        # This is required as eduTeams can not redirect to a dynamic URI
        session["original_destination"] = state
    else:
        state = session.get("original_destination", current_app.app_config.base_url)
    scopes = " ".join(oidc_config.scopes)
    params = {
        "state": state,
        "client_id": oidc_config.client_id,
        "nonce": str(uuid.uuid4()),
        "response_mode": "query",
        "response_type": "code",
        "scope": scopes,
        "redirect_uri": oidc_config.redirect_uri
    }
    if oidc_config.second_factor_authentication_required:
        params["acr_values"] = ACR_VALUES

    args = urllib.parse.urlencode(params)
    authorization_endpoint = f"{oidc_config.authorization_endpoint}?{args}"
    return authorization_endpoint


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


@user_api.route("/query", methods=["GET"], strict_slashes=False)
@json_endpoint
def user_query():
    confirm_write_access()
    wildcard = f"%{query_param('q')}%"
    conditions = [User.name.ilike(wildcard), User.username.ilike(wildcard), User.uid.ilike(wildcard),
                  User.email.ilike(wildcard)]
    return User.query.filter(or_(*conditions)).limit(full_text_search_autocomplete_limit).all(), 200


@user_api.route("/platform_admins", strict_slashes=False)
@json_endpoint
def get_platform_admins():
    confirm_write_access()
    config = current_app.app_config
    admin_users_upgrade = config.feature.admin_users_upgrade
    admin_users = [u.uid for u in config.admin_users]
    platform_admins = User.query.filter(User.uid.in_(admin_users)).all()
    return {"platform_admins": platform_admins, "admin_users_upgrade": admin_users_upgrade}, 200


@user_api.route("/authorization", strict_slashes=False)
@json_endpoint
def authorization():
    state = query_param("state", required=False, default=None)
    authorization_endpoint = _get_authorization_url(state)
    return {"authorization_endpoint": authorization_endpoint}, 200


@user_api.route("/resume-session", strict_slashes=False)
def resume_session():
    logger = ctx_logger("oidc")

    cfg = current_app.app_config
    oidc_config = cfg.oidc
    code = query_param("code", required=False, default=None)
    if not code:
        # This means that we are not in the redirect callback, but at the redirect from eduTeams
        logger.debug("Redirect to login in resume-session to start OIDC flow")
        authorization_endpoint = _get_authorization_url()
        return redirect(authorization_endpoint)

    scopes = " ".join(oidc_config.scopes)
    payload = {
        "code": code,
        "grant_type": "authorization_code",
        "scope": scopes,
        "redirect_uri": oidc_config.redirect_uri
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
        "Accept": "application/json, application/json;charset=UTF-8"
    }
    response = requests.post(oidc_config.token_endpoint, data=urllib.parse.urlencode(payload),
                             headers=headers, auth=(oidc_config.client_id, oidc_config.client_secret))
    if response.status_code != 200:
        return _redirect_with_error(logger, f"Server error: Token endpoint error (http {response.status_code}")

    token_json = response.json()
    access_token = token_json["access_token"]

    headers = {
        "Accept": "application/json, application/json;charset=UTF-8",
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.get(oidc_config.userinfo_endpoint, headers=headers)
    if response.status_code != 200:
        return _redirect_with_error(logger, f"Server error: User info endpoint error (http {response.status_code}")

    logger = ctx_logger("user")
    user_info_json = response.json()

    logger.debug(f"Userinfo endpoint results {user_info_json}")

    uid = user_info_json["sub"]
    user = User.query.filter(User.uid == uid).first()
    if not user:
        user = User(uid=uid, created_by="system", updated_by="system")
        add_user_claims(user_info_json, uid, user)

        # last_login_date is set later in this method
        user.last_accessed_date = datetime.datetime.now()
        logger.info(f"Provisioning new user {user.uid}")
    else:
        logger.info(f"Updating user {user.uid} with new claims / updated at")
        add_user_claims(user_info_json, uid, user)

    encoded_id_token = token_json["id_token"]
    id_token = decode_jwt_token(encoded_id_token)

    no_mfa_required = not oidc_config.second_factor_authentication_required
    idp_mfa = id_token.get("acr") == ACR_VALUES

    idp_allowed = mfa_idp_allowed(user, user.schac_home_organisation, None)

    second_factor_confirmed = no_mfa_required or idp_mfa or idp_allowed
    if second_factor_confirmed:
        user.last_login_date = datetime.datetime.now()

    user = db.session.merge(user)
    db.session.commit()

    user_accepted_aup = user.has_agreed_with_aup()
    store_user_in_session(user, second_factor_confirmed, user_accepted_aup)

    if not user_accepted_aup:
        location = f"{cfg.base_url}/aup"
    elif not second_factor_confirmed:
        location = f"{cfg.base_url}/2fa"
    else:
        location = session.get("original_destination", cfg.base_url)

    return redirect(location)


def _redirect_with_error(logger, error_msg):
    logger.error(error_msg)
    return redirect(f"{current_app.app_config.base_url}/error")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    if "user" in session and not session["user"]["guest"]:
        user_from_session = session["user"]
        user_from_db = _user_query() \
            .filter(User.id == user_from_session["id"]) \
            .first()

        if user_from_db is None:
            return {"uid": "anonymous", "guest": True, "admin": False}, 200
        if user_from_db.suspended:
            logger = ctx_logger("user")
            logger.info(
                f"Returning error for user {user_from_db.uid} as user is suspended")
            return {"error": f"user {user_from_db.uid} is suspended"}, 409

        # Do not expose the actual secret of second_factor_auth
        user_from_session["second_factor_auth"] = bool(user_from_db.second_factor_auth)
        # Do not send all information if second_factor is required
        if not user_from_session["second_factor_confirmed"]:
            return user_from_session, 200

        user = {**jsonify(user_from_db).json, **user_from_session}

        if len(user_from_db.suspend_notifications) > 0:
            user["successfully_activated"] = True
            user_from_db.suspend_notifications = []
            db.session.merge(user_from_db)
            db.session.commit()
        _add_counts(user)
        _add_service_aups(user, user_from_db)
        return user, 200
    else:
        return {"uid": "anonymous", "guest": True, "admin": False}, 200


@user_api.route("/refresh", strict_slashes=False)
@json_endpoint
def refresh():
    user_id = current_user_id()
    user = _user_query().filter(User.id == user_id).one()
    return _user_json_response(user, False)


@user_api.route("/suspended", strict_slashes=False)
@json_endpoint
def suspended():
    confirm_write_access()
    return User.query.filter(User.suspended == True).all(), 200  # noqa: E712


@user_api.route("/activate", methods=["PUT"], strict_slashes=False)
@json_endpoint
def activate():
    body = current_request.get_json()
    if "collaboration_id" in body:
        confirm_collaboration_admin(body["collaboration_id"], org_manager_allowed=False)
    elif "organisation_id" in body:
        confirm_organisation_admin(body["organisation_id"])
    else:
        confirm_write_access()

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
    user_id = current_user_id()

    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    if impersonate_id:
        confirm_allow_impersonation()

    user = User.query.get(user_id)
    user_json = current_request.get_json()

    validate_ip_networks(user_json, networks_name="user_ip_networks")

    ip_networks_json = [nw for nw in user_json["user_ip_networks"]] if "user_ip_networks" in user_json else []
    user_ip_network_ids = [network["id"] for network in ip_networks_json if "id" in network and network["id"]]
    for network in user.user_ip_networks:
        if network.id not in user_ip_network_ids:
            db.session.delete(network)
        else:
            existing_network = next(n for n in ip_networks_json if int(n.get("id", -1)) == network.id)
            network.network_value = existing_network["network_value"]
            db.session.merge(network)
    new_networks = [network for network in ip_networks_json if "id" not in network or not network["id"]]
    audit_trail = {"created_by": user.uid, "updated_by": user.uid}
    for network in new_networks:
        db.session.merge(UserIpNetwork(**{**network, **{"user_id": user.id}, **audit_trail}))

    ssh_keys_json = [ssh_key for ssh_key in user_json["ssh_keys"] if
                     ssh_key["ssh_value"]] if "ssh_keys" in user_json else []
    for ssh_key in ssh_keys_json:
        ssh_value = ssh_key["ssh_value"]
        if ssh_value and (ssh_value.startswith("---- BEGIN SSH2 PUBLIC KEY ----")
                          or ssh_value.startswith("-----BEGIN PUBLIC KEY-----")  # noQA:W503
                          or ssh_value.startswith("-----BEGIN RSA PUBLIC KEY-----")):  # noQA:W503
            with tempfile.NamedTemporaryFile() as f:
                f.write(ssh_value.encode())
                f.flush()
                options = ["ssh-keygen", "-i", "-f", f.name]
                if ssh_value.startswith("-----BEGIN PUBLIC KEY-----"):
                    options.append("-mPKCS8")
                if ssh_value.startswith("-----BEGIN RSA PUBLIC KEY-----"):
                    options.append("-mPEM")
                res = subprocess.run(options, stdout=subprocess.PIPE)
                if res.returncode == 0:
                    ssh_key["ssh_value"] = res.stdout.decode()

    ssh_key_ids = [ssh_key["id"] for ssh_key in ssh_keys_json if "id" in ssh_key]
    for ssh_key in user.ssh_keys:
        if ssh_key.id not in ssh_key_ids:
            db.session.delete(ssh_key)
        else:
            existing_ssh_key = next(s for s in ssh_keys_json if int(s.get("id", -1)) == ssh_key.id)
            ssh_key.ssh_value = "".join(
                ch for ch in existing_ssh_key["ssh_value"] if unicodedata.category(ch)[0] != "C")
            db.session.merge(ssh_key)
    new_ssh_keys = [ssh_key for ssh_key in ssh_keys_json if "id" not in ssh_key]
    for ssh_key in new_ssh_keys:
        ssh_value = "".join(ch for ch in ssh_key["ssh_value"] if unicodedata.category(ch)[0] != "C")
        db.session.merge(SshKey(ssh_value=ssh_value, user_id=user.id))

    user.updated_by = user.uid
    db.session.merge(user)
    db.session.commit()
    return user, 201


@user_api.route("/other", strict_slashes=False)
@json_endpoint
def other():
    confirm_allow_impersonation()

    uid = query_param("uid")
    user = _user_query().filter(User.uid == uid).one()
    # avoid 2fa registration / validation
    return _user_json_response(user, True)


@user_api.route("/find_by_id", strict_slashes=False)
@json_endpoint
def find_by_id():
    confirm_write_access()
    return _user_query() \
               .options(joinedload(User.service_aups)
                        .subqueryload(ServiceAup.service)) \
               .filter(User.id == query_param("id")).one(), 200


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
        .options(selectinload(User.collaboration_memberships)
                 .selectinload(CollaborationMembership.collaboration)) \
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

    user_id = current_user_id()
    user = User.query.filter(User.id == user_id).one()

    if not is_admin_user(user):
        raise Forbidden("Must be admin user")

    user.confirmed_super_user = True
    user = db.session.merge(user)
    db.session.commit()

    store_user_in_session(user, True, user.has_agreed_with_aup())

    response = redirect(current_app.app_config.feature.admin_users_upgrade_redirect_url)
    response.headers.set("x-session-alive", "true")
    response.headers["server"] = ""
    return response


@user_api.route("/logout", strict_slashes=False)
def logout():
    session["user"] = None
    session.clear()
    return {}, 200


@user_api.route("/", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def delete_user():
    user_id = current_user_id()
    user = User.query.get(user_id)
    mail_account_deletion(user)
    db.session.delete(user)

    if user.username:
        history_not_exists = UserNameHistory.query.filter(UserNameHistory.username == user.username).count() == 0
        if history_not_exists:
            user_name_history = UserNameHistory(username=user.username)
            db.session.merge(user_name_history)
    db.session.commit()

    session["user"] = None
    session.clear()
    return user, 204


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    js_dump = json.dumps(current_request.json, default=str)
    ctx_logger("user").exception(js_dump)
    mail_conf = current_app.app_config.mail
    if mail_conf.send_js_exceptions and not os.environ.get("TESTING"):
        user = current_user()
        user_id = user.get("email", user.get("name"))
        mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, js_dump)

    return {}, 201
