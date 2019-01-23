from secrets import token_urlsafe

from flask import Blueprint, request as current_request, session, current_app
from sqlalchemy import text, func
from sqlalchemy.orm import joinedload, contains_eager
from sqlalchemy.orm import load_only

from server.api.base import json_endpoint
from server.api.security import confirm_write_access
from server.db.db import Organisation, db, OrganisationMembership, Collaboration, OrganisationInvitation, User
from server.db.defaults import default_expiry_date
from server.db.models import update, save, delete
from server.mail import mail_organisation_invitation

organisation_api = Blueprint("organisation_api", __name__, url_prefix="/api/organisations")


@organisation_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = current_request.args.get("name")
    existing_organisation = current_request.args.get("existing_organisation", "")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.name) == func.lower(name)) \
        .filter(func.lower(Organisation.name) != func.lower(existing_organisation)) \
        .first()
    return org is not None, 200


@organisation_api.route("/identifier_exists", strict_slashes=False)
@json_endpoint
def identifier_exists():
    identifier = current_request.args.get("identifier")
    existing_organisation = current_request.args.get("existing_organisation", "")
    org = Organisation.query.options(load_only("id")) \
        .filter(func.lower(Organisation.tenant_identifier) == func.lower(identifier)) \
        .filter(func.lower(Organisation.tenant_identifier) != func.lower(existing_organisation)) \
        .first()
    return org is not None, 200


@organisation_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    sql = text(f"SELECT id, name, description FROM organisations "
               f"WHERE MATCH (name, description) AGAINST ('{q}*' IN BOOLEAN MODE)")
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@organisation_api.route("/mine_lite", strict_slashes=False)
@json_endpoint
def my_organisations_lite():
    user_id = session["user"]["id"]
    organisations = Organisation.query \
        .join(Organisation.organisation_memberships) \
        .join(OrganisationMembership.user) \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(OrganisationMembership.role == "admin") \
        .all()
    return organisations, 200


@organisation_api.route("/<id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(id):
    user_id = session["user"]["id"]
    collaboration = Organisation.query \
        .options(joinedload(Organisation.organisation_memberships)
                 .subqueryload(OrganisationMembership.user)) \
        .options(joinedload(Organisation.organisation_invitations)
                 .subqueryload(OrganisationInvitation.user)) \
        .join(OrganisationMembership.user) \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(Organisation.id == id) \
        .one()
    return collaboration, 200


@organisation_api.route("/", strict_slashes=False)
@json_endpoint
def my_organisations():
    user_id = session["user"]["id"]
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
    user = User.query.get(session["user"]["id"])

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                            organisation=organisation, user=user,
                                            expiry_date=default_expiry_date(json_dict=data),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, organisation, [administrator])
    db.session.commit()

    return None, 201


@organisation_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_organisation():
    confirm_write_access()
    data = current_request.get_json()
    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None

    res = save(Organisation)
    user = User.query.get(session["user"]["id"])
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
            "base_url": current_app.app_config.base_url
        }, organisation, [administrator])
    db.session.commit()

    return res


@organisation_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_organisation():
    def override_func():
        user_id = session["user"]["id"]
        organisation_id = current_request.get_json()["id"]
        return OrganisationMembership.query() \
                   .filter(OrganisationMembership.user_id == user_id) \
                   .filter(OrganisationMembership.organisation_id == organisation_id) \
                   .filter(OrganisationMembership.role == "admin") \
                   .count() > 0

    confirm_write_access(override_func=override_func)
    return update(Organisation)


@organisation_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(id):
    confirm_write_access()
    return delete(Organisation, id)
