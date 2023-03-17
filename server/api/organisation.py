import uuid

from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, g as request_context
from munch import munchify
from sqlalchemy import or_
from sqlalchemy import text, func, bindparam, String
from sqlalchemy.orm import load_only
from sqlalchemy.orm import selectinload

from server.api.base import emit_socket
from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.auth.secrets import generate_token
from server.auth.security import confirm_write_access, current_user_id, is_application_admin, \
    confirm_organisation_admin, is_service_admin, confirm_external_api_call, confirm_read_access, \
    confirm_organisation_admin_or_manager
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.defaults import default_expiry_date, cleanse_short_name
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import Organisation, OrganisationMembership, OrganisationInvitation, User, \
    CollaborationRequest, SchacHomeOrganisation, Collaboration, CollaborationMembership, Invitation
from server.db.models import update, save, delete
from server.mail import mail_organisation_invitation, mail_platform_admins
from server.scim.events import broadcast_organisation_deleted

organisation_api = Blueprint("organisation_api", __name__, url_prefix="/api/organisations")


@organisation_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    confirm_organisation_admin()

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
    confirm_organisation_admin()

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
    confirm_organisation_admin()

    schac_home = query_param("schac_home")
    if not schac_home:
        return False, 200
    existing_organisation_id = query_param("existing_organisation_id", required=False)
    query = SchacHomeOrganisation.query \
        .filter(func.lower(SchacHomeOrganisation.name) == func.lower(schac_home))
    if existing_organisation_id:
        query = query \
            .filter(SchacHomeOrganisation.organisation_id != int(existing_organisation_id))
    res = query.first()
    return res.name if res else False, 200


@organisation_api.route("/schac_home/<organisation_id>", strict_slashes=False)
@json_endpoint
def find_schac_home(organisation_id):
    res = SchacHomeOrganisation.query.filter(SchacHomeOrganisation.organisation_id == organisation_id).first()
    return res.name if res else False, 200


@organisation_api.route("/all", strict_slashes=False)
@json_endpoint
def organisation_all():
    confirm_read_access()
    organisations = Organisation.query.all()
    return organisations, 200


@organisation_api.route("/search", strict_slashes=False)
@json_endpoint
def organisation_search():
    confirm_write_access(override_func=is_service_admin)

    res = []
    q = query_param("q")
    if q and len(q):
        base_query = "SELECT id, name, description, category, logo, short_name, services_restricted FROM organisations "
        not_wild_card = "*" not in q
        if not_wild_card:
            q = replace_full_text_search_boolean_mode_chars(q)
            base_query += f"WHERE MATCH (name, description) AGAINST (:q IN BOOLEAN MODE) " \
                          f"AND id > 0  ORDER BY NAME LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query if not_wild_card else base_query + " ORDER BY NAME")
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)

        res = [{"id": row[0], "name": row[1], "description": row[2], "category": row[3], "logo": row[4],
                "short_name": row[5], "services_restricted": row[6]} for row in result_set]
    return res, 200


@organisation_api.route("/mine_lite", strict_slashes=False)
@json_endpoint
def my_organisations_lite():
    user_id = current_user_id()
    query = Organisation.query
    if not is_application_admin():
        query = query \
            .join(Organisation.organisation_memberships) \
            .filter(OrganisationMembership.user_id == user_id) \
            .filter(OrganisationMembership.role.in_(["admin", "manager"]))
    organisations = query.all()
    return organisations, 200


@organisation_api.route("/name_by_id/<organisation_id>", strict_slashes=False)
@json_endpoint
def organisation_name_by_id(organisation_id):
    confirm_organisation_admin_or_manager(organisation_id)
    res = Organisation.query.options(load_only("name")).filter(Organisation.id == organisation_id).one()
    return {"name": res.name}, 200


@organisation_api.route("/v1", strict_slashes=False)
@swag_from("../swagger/public/paths/get_collaborations_by_organisation.yml")
@json_endpoint
def api_organisation_details():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation
    for collaboration in organisation.collaborations:
        collaboration.groups
        collaboration.tags
    return organisation, 200


@organisation_api.route("/<organisation_id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(organisation_id):
    query = Organisation.query \
        .options(selectinload(Organisation.organisation_memberships)
                 .selectinload(OrganisationMembership.user)) \
        .options(selectinload(Organisation.organisation_invitations)
                 .selectinload(OrganisationInvitation.user)) \
        .options(selectinload(Organisation.api_keys)) \
        .options(selectinload(Organisation.services)) \
        .options(selectinload(Organisation.collaboration_requests)
                 .selectinload(CollaborationRequest.requester)) \
        .options(selectinload(Organisation.collaborations)
                 .selectinload(Collaboration.tags)) \
        .filter(Organisation.id == organisation_id)

    if not request_context.is_authorized_api_call:
        is_admin = is_application_admin()

        if not is_admin:
            user_id = current_user_id()
            query = query \
                .join(Organisation.organisation_memberships) \
                .join(OrganisationMembership.user) \
                .filter(OrganisationMembership.role.in_(["admin", "manager"])) \
                .filter(OrganisationMembership.user_id == user_id)

    organisation = query.one()
    return organisation, 200


@organisation_api.route("/", strict_slashes=False)
@json_endpoint
def my_organisations():
    user_id = current_user_id()
    organisations = Organisation.query \
        .join(Organisation.organisation_memberships) \
        .filter(OrganisationMembership.user_id == user_id) \
        .all()
    return organisations, 200


@organisation_api.route("/find_by_schac_home_organisation", strict_slashes=False)
@json_endpoint
def organisation_by_schac_home():
    user = User.query.filter(User.id == current_user_id()).one()
    organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)

    entitlement = current_app.app_config.collaboration_creation_allowed_entitlement
    auto_aff = bool(user.entitlement) and entitlement in user.entitlement
    return [{"id": org.id,
             "name": org.name,
             "logo": org.logo,
             "collaboration_creation_allowed": org.collaboration_creation_allowed,
             "collaboration_creation_allowed_entitlement": auto_aff,
             "required_entitlement": entitlement,
             "user_entitlement": user.entitlement,
             "has_members": len(org.organisation_memberships) > 0,
             "on_boarding_msg": org.on_boarding_msg,
             "schac_home_organisations": [sho.name for sho in org.schac_home_organisations],
             "short_name": org.short_name} for org in organisations], 200


@organisation_api.route("/identity_provider_display_name", strict_slashes=False)
@json_endpoint
def identity_provider_display_name():
    user = User.query.filter(User.id == current_user_id()).one()
    schac_home_organisation = user.schac_home_organisation
    if not schac_home_organisation:
        return None, 200

    lang = query_param("lang", required=False, default="en")
    idp_name = idp_display_name(schac_home_organisation, lang)
    return {"display_name": idp_name}, 200


@organisation_api.route("/invites-preview", methods=["POST"], strict_slashes=False)
@json_endpoint
def organisation_invites_preview():
    data = current_request.get_json()
    message = data.get("message", None)
    intended_role = data.get("intended_role", "manager")

    organisation = Organisation.query.get(data["organisation_id"])
    confirm_organisation_admin(organisation.id)

    user = User.query.get(current_user_id())
    invitation = munchify({
        "user": user,
        "organisation": organisation,
        "intended_role": intended_role,
        "message": message,
        "hash": generate_token(),
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

    administrators = data.get("administrators", [])
    intended_role = data.get("intended_role")
    intended_role = "manager" if intended_role not in ["admin", "manager"] else intended_role

    message = data.get("message", None)

    organisation = Organisation.query.get(organisation_id)
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=generate_token(), intended_role=intended_role,
                                            message=message, invitee_email=administrator,
                                            organisation=organisation, user=user,
                                            expiry_date=default_expiry_date(json_dict=data),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "recipient": administrator
        }, organisation, [administrator])

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return None, 201


@organisation_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_organisation():
    confirm_write_access()
    data = current_request.get_json()

    _clear_api_keys(data)
    cleanse_short_name(data)
    data["identifier"] = str(uuid.uuid4())

    administrators = data.get("administrators", [])
    intended_role = data.get("intended_role", "admin")
    intended_role = "admin" if intended_role not in ["admin", "manager"] else intended_role

    message = data.get("message", None)

    res = save(Organisation, custom_json=data)
    user = User.query.get(current_user_id())
    organisation = res[0]
    for administrator in administrators:
        invitation = OrganisationInvitation(hash=generate_token(), message=message, invitee_email=administrator,
                                            organisation_id=organisation.id, user_id=user.id,
                                            intended_role=intended_role,
                                            expiry_date=default_expiry_date(),
                                            created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_organisation_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "recipient": administrator
        }, organisation, [administrator])

    mail_platform_admins(organisation)

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

    _clear_api_keys(data)
    cleanse_short_name(data)

    organisation = Organisation.query.get(data["id"])
    if organisation.short_name != data["short_name"]:
        for collaboration in organisation.collaborations:
            collaboration.global_urn = f"{data['short_name']}:{collaboration.short_name}"
            db.session.merge(collaboration)
            for group in collaboration.groups:
                group.global_urn = f"{data['short_name']}:{collaboration.short_name}:{group.short_name}"
                db.session.merge(group)

    if not is_application_admin() and organisation.services_restricted:
        data["services_restricted"] = True

    # Corner case: user removed name and added the exact same name again, prevent duplicate entry
    existing_names = [sho.name for sho in organisation.schac_home_organisations]
    if "schac_home_organisations" in data:
        if len([sho for sho in data["schac_home_organisations"] if
                not sho.get("id") and sho["name"] in existing_names]) > 0:
            organisation.schac_home_organisations.clear()

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return update(Organisation, custom_json=data, allow_child_cascades=False,
                  allowed_child_collections=["schac_home_organisations"])


@organisation_api.route("/<organisation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(organisation_id):
    confirm_write_access()

    broadcast_organisation_deleted(organisation_id)
    return delete(Organisation, organisation_id)


@organisation_api.route("/<organisation_id>/users", methods=["GET"], strict_slashes=False)
@json_endpoint
def search_users(organisation_id):
    confirm_organisation_admin_or_manager(organisation_id)
    wildcard = f"%{query_param('q')}%"
    conditions = [User.name.ilike(wildcard), User.username.ilike(wildcard), User.email.ilike(wildcard)]
    users = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.organisation) \
        .filter(Organisation.id == organisation_id) \
        .filter(or_(*conditions)) \
        .all()
    if is_application_admin():
        return users, 200
    else:
        return [user.allowed_attr_view([organisation_id], False) for user in users], 200


@organisation_api.route("/<organisation_id>/invites", methods=["GET"], strict_slashes=False)
@json_endpoint
def search_invites(organisation_id):
    confirm_organisation_admin_or_manager(organisation_id)
    wildcard = f"%{query_param('q')}%"
    return Invitation.query \
               .join(Invitation.collaboration) \
               .join(Collaboration.organisation) \
               .filter(Organisation.id == organisation_id) \
               .filter(Invitation.invitee_email.ilike(wildcard)) \
               .all(), 200
