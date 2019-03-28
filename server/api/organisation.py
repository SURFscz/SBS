import datetime
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app, g as request_context
from sqlalchemy import text, func
from sqlalchemy.orm import joinedload, contains_eager
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_write_access, current_user_id, is_admin_user, current_user_uid, \
    is_application_admin, confirm_authorized_api_call
from server.db.db import Organisation, db, OrganisationMembership, Collaboration, OrganisationInvitation, User
from server.db.defaults import default_expiry_date
from server.db.defaults import full_text_search_autocomplete_limit
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


@organisation_api.route("/identifier_exists", strict_slashes=False)
@json_endpoint
def identifier_exists():
    identifier = query_param("identifier")
    existing_organisation = query_param("existing_organisation", required=False, default="")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.tenant_identifier) == func.lower(identifier)) \
        .filter(func.lower(Organisation.tenant_identifier) != func.lower(existing_organisation)) \
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
    q = query_param("q")
    base_query = "SELECT id, name, description FROM organisations "
    if q != "*":
        base_query += f"WHERE MATCH (name, description) AGAINST ('{q}*' IN BOOLEAN MODE) " \
            f"AND id > 0 LIMIT {full_text_search_autocomplete_limit}"
    sql = text(base_query)
    result_set = db.engine.execute(sql)
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


@organisation_api.route("/<id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(id):
    query = Organisation.query \
        .options(joinedload(Organisation.organisation_memberships).subqueryload(OrganisationMembership.user)) \
        .options(joinedload(Organisation.organisation_invitations).subqueryload(OrganisationInvitation.user)) \
        .filter(Organisation.id == id)

    if not request_context.is_authorized_api_call:
        user_uid = current_user_uid()
        is_admin = is_admin_user(user_uid)

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
        .options(contains_eager(Organisation.organisation_memberships).
                 contains_eager(OrganisationMembership.user)) \
        .options(contains_eager(Organisation.collaborations).
                 contains_eager(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Organisation.organisation_invitations)) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    return organisations, 200


@organisation_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def organisation_invites():
    confirm_write_access()
    data = current_request.get_json()
    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None

    organisation = Organisation.query.get(data["organisation_id"])
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                            organisation=organisation, user=user,
                                            expiry_date=default_expiry_date(json_dict=data),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "expiry_days": (invitation.expiry_date - datetime.datetime.today()).days
        }, organisation, [administrator])
    return None, 201


@organisation_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_organisation():
    confirm_write_access()
    data = current_request.get_json()
    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None

    res = save(Organisation)
    user = User.query.get(current_user_id())
    for administrator in administrators:
        organisation = res[0]
        invitation = OrganisationInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                            organisation=organisation, user=user,
                                            expiry_date=default_expiry_date(),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "expiry_days": (invitation.expiry_date - datetime.datetime.today()).days
        }, organisation, [administrator])
    return res


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
    return update(Organisation, allow_child_cascades=False)


@organisation_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(id):
    confirm_write_access()
    return delete(Organisation, id)
