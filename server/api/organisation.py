# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app, g as request_context
from munch import munchify
from sqlalchemy import text, func, bindparam, String
from sqlalchemy.orm import joinedload, contains_eager
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.auth.security import confirm_write_access, current_user_id, is_application_admin, \
    confirm_authorized_api_call, confirm_organisation_admin, is_collaboration_admin, confirm_read_access
from server.db.db import db
from server.db.defaults import default_expiry_date, cleanse_short_name
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import Organisation, OrganisationMembership, Collaboration, OrganisationInvitation, User, \
    CollaborationRequest
from server.db.models import update, save, delete
from server.mail import mail_organisation_invitation

organisation_api = Blueprint("organisation_api", __name__, url_prefix="/api/organisations")


@organisation_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    existing_organisation = query_param("existing_organisation", required=False, default="")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.name) == func.lower(name)) \
        .filter(func.lower(Organisation.name) != func.lower(existing_organisation)) \
        .first()
    return org is not None, 200


@organisation_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def short_name_exists():
    short_name = query_param("short_name")
    existing_organisation = query_param("existing_organisation", required=False, default="")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.short_name) == func.lower(short_name)) \
        .filter(func.lower(Organisation.short_name) != func.lower(existing_organisation)) \
        .first()
    return org is not None, 200


@organisation_api.route("/schac_home_exists", strict_slashes=False)
@json_endpoint
def schac_home_exists():
    schac_home = query_param("schac_home")
    if not schac_home:
        return False, 200
    existing_organisation = query_param("existing_organisation", required=False, default="")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.schac_home_organisation) == func.lower(schac_home)) \
        .filter(func.lower(Organisation.schac_home_organisation) != func.lower(existing_organisation)) \
        .first()
    return org is not None, 200


@organisation_api.route("/all", strict_slashes=False)
@json_endpoint
def organisation_all():
    confirm_authorized_api_call()
    organisations = Organisation.query.all()
    return organisations, 200


@organisation_api.route("/search", strict_slashes=False)
@json_endpoint
def organisation_search():
    confirm_read_access(override_func=lambda: True)

    res = []
    q = query_param("q")
    if q and len(q):
        base_query = "SELECT id, name, description FROM organisations "
        not_wild_card = "*" not in q
        if not_wild_card:
            q = replace_full_text_search_boolean_mode_chars(q)
            base_query += f"WHERE MATCH (name, description) AGAINST (:q IN BOOLEAN MODE) " \
                          f"AND id > 0  ORDER BY NAME LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query if not_wild_card else base_query + " ORDER BY NAME")
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)

        res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@organisation_api.route("/mine_lite", strict_slashes=False)
@json_endpoint
def my_organisations_lite():
    user_id = current_user_id()
    query = Organisation.query
    if not is_application_admin():
        query = query \
            .join(Organisation.organisation_memberships) \
            .join(OrganisationMembership.user) \
            .filter(OrganisationMembership.user_id == user_id) \
            .filter(OrganisationMembership.role == "admin")
    organisations = query.all()
    return organisations, 200


@organisation_api.route("/lite/<organisation_id>", strict_slashes=False)
@json_endpoint
def organisation_by_id_lite(organisation_id):
    def override_func():
        return is_collaboration_admin(organisation_id=organisation_id)

    confirm_write_access(override_func=override_func)
    organisation = Organisation.query.get(organisation_id)
    return organisation, 200


@organisation_api.route("/<organisation_id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(organisation_id):
    query = Organisation.query \
        .options(joinedload(Organisation.organisation_memberships)
                 .subqueryload(OrganisationMembership.user)) \
        .options(joinedload(Organisation.organisation_invitations)
                 .subqueryload(OrganisationInvitation.user)) \
        .options(joinedload(Organisation.api_keys)) \
        .options(joinedload(Organisation.collaboration_requests)
                 .subqueryload(CollaborationRequest.requester)) \
        .options(joinedload(Organisation.collaborations)) \
        .filter(Organisation.id == organisation_id)

    if not request_context.is_authorized_api_call:
        is_admin = is_application_admin()

        if not is_admin:
            user_id = current_user_id()
            query = query \
                .join(OrganisationMembership.user) \
                .filter(OrganisationMembership.role == "admin") \
                .filter(OrganisationMembership.user_id == user_id)

    organisation = query.one()
    return organisation, 200


@organisation_api.route("/", strict_slashes=False)
@json_endpoint
def my_organisations():
    user_id = current_user_id()
    organisations = Organisation.query \
        .join(Organisation.organisation_memberships) \
        .join(OrganisationMembership.user) \
        .outerjoin(Organisation.collaborations) \
        .outerjoin(Collaboration.collaboration_memberships) \
        .outerjoin(Organisation.organisation_invitations) \
        .outerjoin(Organisation.collaboration_requests) \
        .options(contains_eager(Organisation.organisation_memberships).
                 contains_eager(OrganisationMembership.user)) \
        .options(contains_eager(Organisation.collaborations).
                 contains_eager(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Organisation.organisation_invitations)) \
        .options(contains_eager(Organisation.collaboration_requests)) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    return organisations, 200


@organisation_api.route("/find_by_schac_home_organisation", strict_slashes=False)
@json_endpoint
def organisations_by_schac_home_organisation():
    schac_home_organisation = User.query.filter(User.id == current_user_id()).one().schac_home_organisation
    if not schac_home_organisation:
        return [], 200

    organisations = Organisation.query \
        .filter(Organisation.schac_home_organisation == schac_home_organisation) \
        .all()

    return list(map(lambda organisation: {"id": organisation.id,
                                          "name": organisation.name,
                                          "short_name": organisation.short_name}, organisations)), 200


@organisation_api.route("/invites-preview", methods=["POST"], strict_slashes=False)
@json_endpoint
def organisation_invites_preview():
    data = current_request.get_json()
    message = data["message"] if "message" in data else None

    organisation = Organisation.query.get(data["organisation_id"])
    confirm_organisation_admin(organisation.id)

    user = User.query.get(current_user_id())
    invitation = munchify({
        "user": user,
        "organisation": organisation,
        "message": message,
        "hash": token_urlsafe(),
        "expiry_date": default_expiry_date(data)
    })
    html = mail_organisation_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url
    }, organisation, [], preview=True)
    return {"html": html}, 201


@organisation_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invites():
    data = current_request.get_json()
    organisation_id = data["organisation_id"]

    confirm_organisation_admin(organisation_id)

    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None

    organisation = Organisation.query.get(organisation_id)
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                            organisation_id=organisation.id, user_id=user.id,
                                            expiry_date=default_expiry_date(json_dict=data),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, organisation, [administrator])
    return None, 201


@organisation_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_organisation():
    confirm_write_access()
    data = current_request.get_json()

    _clear_api_keys(data)
    cleanse_short_name(data)

    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None

    res = save(Organisation, custom_json=data)
    user = User.query.get(current_user_id())
    for administrator in administrators:
        organisation = res[0]
        invitation = OrganisationInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                            organisation_id=organisation.id, user_id=user.id,
                                            expiry_date=default_expiry_date(),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, organisation, [administrator])
    return res


def _clear_api_keys(data):
    if "api_keys" in data:
        del data["api_keys"]


@organisation_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_organisation():
    def override_func():
        user_id = current_user_id()
        organisation_id = current_request.get_json()["id"]
        count = OrganisationMembership.query \
            .filter(OrganisationMembership.user_id == user_id) \
            .filter(OrganisationMembership.organisation_id == organisation_id) \
            .filter(OrganisationMembership.role == "admin") \
            .count()
        return count > 0

    confirm_write_access(override_func=override_func)

    data = current_request.get_json()
    if not is_application_admin():
        if "schac_home_organisation" in data:
            del data["schac_home_organisation"]

    _clear_api_keys(data)
    cleanse_short_name(data)

    return update(Organisation, custom_json=data, allow_child_cascades=False)


@organisation_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(id):
    confirm_write_access()
    return delete(Organisation, id)
