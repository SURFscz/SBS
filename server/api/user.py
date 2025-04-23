import itertools
import json
import os
import unicodedata
import urllib.parse
import uuid

import requests
from flask import Blueprint, current_app, redirect, make_response
from flask import request as current_request, session, jsonify
from sqlalchemy import text, or_, bindparam, String
from sqlalchemy.orm import selectinload
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, organisation_by_user_schac_home
from server.api.base import replace_full_text_search_boolean_mode_chars
from server.auth.mfa import ACR_VALUES, store_user_in_session, decode_jwt_token, user_requires_sram_mfa
from server.auth.security import confirm_allow_impersonation, is_admin_user, current_user_id, confirm_read_access, \
    confirm_collaboration_admin, confirm_organisation_admin, current_user, confirm_write_access, \
    confirm_organisation_admin_or_manager, is_application_admin, CSRF_TOKEN
from server.auth.user_claims import add_user_claims, valid_user_attributes
from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit, SBS_LOGIN
from server.db.domain import User, OrganisationMembership, CollaborationMembership, JoinRequest, CollaborationRequest, \
    UserNameHistory, SshKey, ServiceMembership, ServiceAup, ServiceRequest, ServiceConnectionRequest, Service, \
    SchacHomeOrganisation
from server.db.models import log_user_login
from server.db.ssh_converter import convert_to_open_ssh
from server.logger.context_logger import ctx_logger
from server.mail import mail_error, mail_account_deletion
from server.scim.events import broadcast_user_deleted, broadcast_user_changed
from server.tools import dt_now

user_api = Blueprint("user_api", __name__, url_prefix="/api/users")


def _add_counts(user: dict):
    if is_admin_user(user):
        user["total_service_requests"] = ServiceRequest.query.count()
        user["total_open_service_requests"] = ServiceRequest.query.filter(ServiceRequest.status == "open").count()


def _add_schac_home_organisations(user: dict, user_from_db: User):
    organisations = organisation_by_user_schac_home(user_from_db)
    user["organisations_from_user_schac_home"] = organisations


# TODO see https://github.com/SURFscz/SBS/issues/1559
def _add_service_aups(user: dict, user_from_db: User):
    # Find all services available for this user and then see if there are missing ServiceAup's
    services = []
    for cm in user_from_db.collaboration_memberships:
        # TODO we no longer support organisation.services see https://github.com/SURFscz/SBS/issues/421
        services += [s for s in cm.collaboration.services] + [s for s in cm.collaboration.organisation.services]

    service_identifiers = [aup.service_id for aup in user_from_db.service_aups]

    missing_services = [s for s in services if s.id not in service_identifiers and s.accepted_user_policy]
    unique_missing_services = list({s.id: s for s in missing_services}.values())

    service_emails = {}
    for s in unique_missing_services:
        if s.contact_email:
            service_emails[s.id] = [s.contact_email]
        else:
            service_emails[s.id] = [m.user.email for m in s.service_memberships]

    # Avoid ValueError: Circular reference detected
    user["services_without_aup"] = [
        {"id": s.id, "logo": s.logo, "name": s.name, "accepted_user_policy": s.accepted_user_policy,
         "privacy_policy": s.privacy_policy} for s in unique_missing_services]
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


def _add_reference_data(user: dict, user_from_db: User):
    _add_counts(user)
    _add_service_aups(user, user_from_db)
    _add_schac_home_organisations(user, user_from_db)


def _user_query():
    # Use selectinload for Many-To-One relationships and joinedload for One-to-Many/ Many-to-Many.
    return User.query \
        .options(selectinload(User.organisation_memberships)
                 .joinedload(OrganisationMembership.organisation, innerjoin=True)) \
        .options(selectinload(User.collaboration_memberships)
                 .joinedload(CollaborationMembership.collaboration, innerjoin=True)) \
        .options(selectinload(User.service_memberships)
                 .joinedload(ServiceMembership.service, innerjoin=True)) \
        .options(selectinload(User.join_requests)
                 .joinedload(JoinRequest.collaboration, innerjoin=True)) \
        .options(selectinload(User.service_connection_requests)
                 .joinedload(ServiceConnectionRequest.service, innerjoin=True)) \
        .options(selectinload(User.aups)) \
        .options(selectinload(User.organisation_aups)) \
        .options(selectinload(User.service_requests)) \
        .options(selectinload(User.service_aups)) \
        .options(selectinload(User.collaboration_requests)
                 .joinedload(CollaborationRequest.organisation, innerjoin=True))


def _user_json_response(user, auto_set_second_factor_confirmed):
    second_factor_confirmed = auto_set_second_factor_confirmed or session["user"]["second_factor_confirmed"]
    is_admin = {"admin": is_admin_user(user),
                "second_factor_confirmed": second_factor_confirmed,
                "user_accepted_aup": user.has_agreed_with_aup(),
                "guest": False}
    json_user = jsonify(user).json
    _add_reference_data(json_user, user)
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
    with db.engine.connect() as conn:
        result_set = conn.execute(sql, {"q": f"{q}*"}) if not_wild_card else conn.execute(sql)
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
    conditions = [User.name.ilike(wildcard),
                  User.username.ilike(wildcard),
                  User.uid.ilike(wildcard),
                  User.eduperson_principal_name.ilike(wildcard),
                  User.email.ilike(wildcard)]
    users = User.query.filter(or_(*conditions)).all()
    users_json = jsonify(users).json
    for user_json in users_json:
        memberships = [u for u in users if u.id == user_json["id"]][0].collaboration_memberships
        memberships_json = [{"collaboration": {"id": m.collaboration.id, "name": m.collaboration.name}} for m in
                            memberships]
        user_json["collaboration_memberships"] = memberships_json
    return users_json, 200


@user_api.route("/platform_admins", strict_slashes=False)
@json_endpoint
def get_platform_admins():
    confirm_write_access()
    config = current_app.app_config
    admin_users = [u.uid for u in config.admin_users]
    platform_admins = User.query.filter(User.uid.in_(admin_users)).all()
    return {"platform_admins": platform_admins}, 200


@user_api.route("/authorization", strict_slashes=False)
@json_endpoint
def authorization():
    state = query_param("state", required=False, default=None)
    authorization_endpoint = _get_authorization_url(state)
    return {"authorization_endpoint": authorization_endpoint}, 200


@user_api.route("/service_info", strict_slashes=False)
@json_endpoint
def service_info():
    uid = query_param("uid")
    entity_id = query_param("entity_id")

    res = {}
    user = User.query.filter(User.uid == uid).first()
    organisations = []
    if user:
        res["user_name"] = user.name
        res["user_email"] = user.email
        res["schac_home_organisation"] = user.schac_home_organisation
        organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
        res["organisations"] = [{"co_creation": o.collaboration_creation_allowed} for o in organisations]
    service = Service.query.filter(Service.entity_id == entity_id).first()
    res["service_connection_allowed"] = False
    if service and service.support_email_unauthorized_users:
        res["support_email"] = service.support_email
    if service:
        not_restricted = service.allow_restricted_orgs or not all([org.services_restricted for org in organisations])
        if not service.override_access_allowed_all_connections and (not_restricted or not organisations):
            if service.access_allowed_for_all:
                res["service_connection_allowed"] = True
            elif bool([org for org in organisations if org in service.allowed_organisations]):
                res["service_connection_allowed"] = True
            elif bool([org for org in organisations if org in service.automatic_connection_allowed_organisations]):
                res["service_connection_allowed"] = True
    return res, 200


# Called by eduTeams as this is the redirect URL of SRAM oidc client
@user_api.route("/resume-session", strict_slashes=False)
def resume_session():
    logger = ctx_logger("resume-session/oidc")

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
                             verify=oidc_config.verify_peer, headers=headers,
                             auth=(oidc_config.client_id, oidc_config.client_secret))
    if response.status_code != 200:
        return _redirect_with_error(logger, f"Server error: Token endpoint error (http {response.status_code}")

    token_json = response.json()
    access_token = token_json["access_token"]

    headers = {
        "Accept": "application/json, application/json;charset=UTF-8",
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.get(oidc_config.userinfo_endpoint, headers=headers, verify=oidc_config.verify_peer)
    if response.status_code != 200:
        return _redirect_with_error(logger, f"Server error: User info endpoint error (http {response.status_code}")

    logger = ctx_logger("resume-session/user")
    user_info_json = response.json()

    logger.debug(f"Userinfo endpoint results {user_info_json}")

    uid = user_info_json["sub"]
    user = User.query.filter(User.uid == uid).first()

    encoded_id_token = token_json["id_token"]
    id_token = decode_jwt_token(encoded_id_token)

    if not user:
        # Ensure we don't provision users who have not all the mandatory attributes
        if not valid_user_attributes(user_info_json):
            args = urllib.parse.urlencode({"aud": id_token.get("aud", ""),
                                           "iss": id_token.get("iss", ""),
                                           "sub": id_token.get("sub", "")})
            return redirect(f"{cfg.base_url}/missing-attributes?{args}")

        user = User(uid=uid, external_id=str(uuid.uuid4()), created_by="system", updated_by="system")
        # We need to avoid an auto-insert after flushing a query
        user = db.session.merge(user)
        add_user_claims(user_info_json, uid, user)

        # last_login_date is set later in this method
        user.last_accessed_date = dt_now()
        logger.info(f"Provisioning new user {user.uid}")
    else:
        logger.info(f"Updating user {user.uid} with new claims / updated at")
        add_user_claims(user_info_json, uid, user)

    # Check if we need a second factor for the user
    idp_performed_mfa = id_token.get("acr") == ACR_VALUES
    if idp_performed_mfa:
        logger.debug(f"user {uid}: idp_mfa={idp_performed_mfa} (ACR = '{id_token.get('acr')}')")

    mfa_is_required = user_requires_sram_mfa(user,
                                             issuer_id=id_token.get("iss"),
                                             override_mfa_required=idp_performed_mfa)
    logger.debug(f"SBS login for user {uid} MFA check is required: {mfa_is_required}")

    return redirect_to_client(cfg, not mfa_is_required, user)


def redirect_to_client(cfg, second_factor_confirmed, user):
    logger = ctx_logger("redirect")

    user.successful_login(second_factor_confirmed=second_factor_confirmed)
    user = db.session.merge(user)
    db.session.commit()

    user_accepted_aup = user.has_agreed_with_aup()
    store_user_in_session(user, second_factor_confirmed, user_accepted_aup)

    status, location = get_redirect(cfg, user_accepted_aup, second_factor_confirmed)
    logger.debug(f"Redirecting user {user.uid} to {location}")

    log_user_login(SBS_LOGIN, True, user, user.uid, None, None, status=status)

    return redirect(location)


def get_redirect(cfg, user_accepted_aup, second_factor_confirmed):
    if not user_accepted_aup:
        location = f"{cfg.base_url}/aup"
        status = "AUP_NOT_AGREED"
    elif not second_factor_confirmed:
        location = f"{cfg.base_url}/2fa"
        status = "MFA_REQUIRED"
    elif "original_destination" in session:
        location = session.pop("original_destination")
        status = "ORIGINAL_DESTINATION"
    else:
        location = cfg.base_url
        status = "BASE_URL"

    return status, location


def _do_delete_user(user_id, send_mail_account_deletion=True):
    user = db.session.get(User, user_id)
    if send_mail_account_deletion:
        mail_account_deletion(user)
    if user.username:
        history_not_exists = UserNameHistory.query.filter(UserNameHistory.username == user.username).count() == 0
        if history_not_exists:
            user_name_history = UserNameHistory(username=user.username)
            db.session.merge(user_name_history)
    collaboration_identifiers = [member.collaboration_id for member in user.collaboration_memberships]
    db.session.delete(user)
    db.session.commit()
    broadcast_user_deleted(user.external_id, collaboration_identifiers)
    return user


def _redirect_with_error(logger, error_msg):
    logger.error(error_msg)
    return redirect(f"{current_app.app_config.base_url}/error")


@user_api.route("/me", strict_slashes=False)
@json_endpoint
def me():
    if "user" in session and not session["user"]["guest"]:
        user_from_session = session["user"]
        user_from_db = _user_query().filter(User.id == user_from_session["id"]).first()

        if user_from_db is None:
            return {"uid": "anonymous", "guest": True, "admin": False}, 200

        # Do not expose the actual secret of second_factor_auth
        user_from_session["second_factor_auth"] = bool(user_from_db.second_factor_auth)
        csrf_token = {CSRF_TOKEN: session.get(CSRF_TOKEN)}

        if not user_from_session["second_factor_confirmed"]:
            # Do not send all information if second_factor is required
            return {**user_from_session, **csrf_token}, 200

        # Successful /me call, need to update the last_login for SSO to work with other services
        user_from_db.successful_login()

        user = {**jsonify(user_from_db).json, **user_from_session, **csrf_token}

        # Corner case where it is possible that the AUP has changed during the session of this user
        user["user_accepted_aup"] = user_from_db.has_agreed_with_aup()

        _add_reference_data(user, user_from_db)
        db.session.merge(user_from_db)
        return user, 200
    else:
        return {"uid": "anonymous", "guest": True, "admin": False}, 200


@user_api.route("/personal", strict_slashes=False)
@json_endpoint
def personal():
    user_from_db = User.query \
        .options(selectinload(User.service_aups)) \
        .options(selectinload(User.ssh_keys)) \
        .options(selectinload(User.aups)) \
        .filter(User.id == current_user_id()).first()
    user_json = jsonify(user_from_db).json
    for attribute in [attr for attr in ["second_factor_auth", "mfa_reset_token"] if attr in user_json]:
        del user_json[attribute]
    return user_json, 200


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
    return User.query.filter(User.suspended.is_(True)).all(), 200


@user_api.route("/reset_totp_requested", strict_slashes=False)
@json_endpoint
def reset_totp_requested():
    confirm_write_access()
    return User.query.filter(User.mfa_reset_token.isnot(None)).all(), 200


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

    user = db.session.get(User, int(body["user_id"]))
    user.successful_login()
    user = db.session.merge(user)
    return {}, 201


@user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user():
    headers = current_request.headers
    user_id = current_user_id()

    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    if impersonate_id:
        confirm_allow_impersonation()

    user = db.session.get(User, user_id)
    user_json = current_request.get_json()

    ssh_keys_json = [ssh_key for ssh_key in user_json["ssh_keys"] if
                     ssh_key["ssh_value"]] if "ssh_keys" in user_json else []
    for ssh_key in ssh_keys_json:
        ssh_value = ssh_key["ssh_value"]
        if ssh_value:
            ssh_key["ssh_value"] = convert_to_open_ssh(ssh_value)

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
    user_id = user.id
    db.session.merge(user)
    db.session.commit()

    broadcast_user_changed(user_id)

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
    confirm_organisation_admin_or_manager(organisation_id=None)
    user = _user_query() \
        .options(selectinload(User.service_aups)
                 .joinedload(ServiceAup.service, innerjoin=True)) \
        .filter(User.id == query_param("id")) \
        .one()

    if not is_application_admin():
        # Ensure the user has a collaboration membership in an organisation the current_user is admin or manager of
        curr_user = db.session.get(User, current_user_id())
        current_user_organisation_identifiers = [om.organisation_id for om in curr_user.organisation_memberships]
        user_organisation_identifiers = [cm.collaboration.organisation_id for cm in user.collaboration_memberships]
        if not any([i in current_user_organisation_identifiers for i in user_organisation_identifiers]):
            raise Forbidden()

        return user.allowed_attr_view(current_user_organisation_identifiers, True), 200

    return user, 200


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


@user_api.route("/logout", strict_slashes=False)
def logout():
    session.clear()
    response = make_response({}, 200)

    # Delete all cookies
    for cookie in current_request.cookies:
        response.set_cookie(cookie, "", expires=0)

    return response


@user_api.route("/", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def delete_user():
    user_id = current_user_id()
    user = _do_delete_user(user_id)

    session["user"] = None
    session.clear()
    return user, 204


@user_api.route("/delete_other/<user_id>", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def delete_other_user(user_id):
    confirm_write_access()
    user = _do_delete_user(user_id, send_mail_account_deletion=False)

    return user, 204


@user_api.route("/error", methods=["POST"], strict_slashes=False)
@json_endpoint
def error():
    request_json = current_request.json
    if request_json.get("status") == 429:
        return {}, 201
    user = current_user()
    user_id = user.get("id")
    if not user_id:
        return {}, 201

    # We don't want to fill the logs and more so, don't want to reach queue limits for mail
    error_count = session["error_count"] = int(session.get("error_count", 0)) + 1
    if error_count > 9 and not os.environ.get("PROFILE"):
        # We've got the message, no need for env specific configuration
        return {"message": "Overload error posting"}, 422
    js_dump = json.dumps(request_json, indent=4, default=str)
    ctx_logger("user").exception(js_dump)
    mail_conf = current_app.app_config.mail
    if mail_conf.send_js_exceptions:
        user_id = user.get("email") or user.get("name") or user_id
        mail_error(mail_conf.environment, user_id, mail_conf.send_exceptions_recipients, js_dump)

    return {}, 201
