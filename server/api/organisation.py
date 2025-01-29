import uuid

from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, g as request_context, jsonify
from munch import munchify
from sqlalchemy import or_
from sqlalchemy import text, func, bindparam, String
from sqlalchemy.orm import load_only
from sqlalchemy.orm import selectinload
from werkzeug.exceptions import BadRequest

from server.api.base import emit_socket, organisation_by_user_schac_home
from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.api.organisation_invitation import organisation_invitations_by_email
from server.api.unit import validate_units
from server.auth.secrets import generate_token
from server.auth.security import confirm_write_access, current_user_id, is_application_admin, \
    confirm_organisation_admin, confirm_external_api_call, confirm_read_access, \
    confirm_organisation_admin_or_manager, is_service_admin_or_manager
from server.cron.idp_metadata_parser import idp_display_name
from server.db.db import db
from server.db.defaults import default_expiry_date, cleanse_short_name
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import Organisation, OrganisationMembership, OrganisationInvitation, User, \
    CollaborationRequest, SchacHomeOrganisation, Collaboration, CollaborationMembership, Invitation, \
    ServiceConnectionRequest
from server.db.logo_mixin import logo_url
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
    org = Organisation.query.options(load_only(Organisation.id)) \
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
    org = Organisation.query.options(load_only(Organisation.id)) \
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


@organisation_api.route("/schac_homes", methods=["POST"], strict_slashes=False)
@json_endpoint
def find_schac_homes():
    data = current_request.get_json()
    organisation_identifiers = [item["organisation_id"] for item in data]
    schac_home_organisations = SchacHomeOrganisation.query \
        .filter(SchacHomeOrganisation.organisation_id.in_(organisation_identifiers)) \
        .all()

    def schac_homes(organisation_id):
        return [schac.name for schac in schac_home_organisations if schac.organisation_id == organisation_id]

    res = {item["join_request_id"]: schac_homes(item["organisation_id"]) for item in data}
    return res, 201


@organisation_api.route("/names", methods=["POST"], strict_slashes=False)
@json_endpoint
def find_org_names():
    data = current_request.get_json()
    organisation_identifiers = [item["organisation_id"] for item in data]
    organisations = Organisation.query \
        .options(load_only(Organisation.name)) \
        .filter(Organisation.id.in_(organisation_identifiers)) \
        .all()

    def organisation_name(organisation_id):
        return [org.name for org in organisations if org.id == organisation_id][0]

    res = {item["join_request_id"]: organisation_name(item["organisation_id"]) for item in data}
    return res, 201


@organisation_api.route("/crm_organisations", methods=["GET"], strict_slashes=False)
@json_endpoint
def find_crm_organisations():
    confirm_write_access()
    organisations = Organisation.query \
        .options(load_only(Organisation.id, Organisation.name, Organisation.crm_id)) \
        .filter(Organisation.crm_id != None) \
        .all()  # noqa: E711

    def organisation_result(organisation: Organisation):
        return {"id": organisation.id, "name": organisation.name, "crm_id": organisation.crm_id}

    return [organisation_result(org) for org in organisations], 200


@organisation_api.route("/all", strict_slashes=False)
@json_endpoint
def organisation_all():
    confirm_read_access(override_func=is_service_admin_or_manager)
    organisations = Organisation.query.all()
    return organisations, 200


@organisation_api.route("/search", strict_slashes=False)
@json_endpoint
def organisation_search():
    confirm_write_access(override_func=is_service_admin_or_manager)

    res = []
    q = query_param("q")
    if q and len(q):
        base_query = "SELECT id, name, description, category, uuid4, short_name, services_restricted FROM organisations "
        not_wild_card = "*" not in q
        if not_wild_card:
            q = replace_full_text_search_boolean_mode_chars(q)
            base_query += f"WHERE MATCH (name, description) AGAINST (:q IN BOOLEAN MODE) " \
                          f"AND id > 0  ORDER BY NAME LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query if not_wild_card else base_query + " ORDER BY NAME")
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        with db.engine.connect() as conn:
            result_set = conn.execute(sql, {"q": f"{q}*"}) if not_wild_card else conn.execute(sql)

        res = [{"id": row[0], "name": row[1], "description": row[2], "category": row[3],
                "logo": logo_url("organisations", row[4]),
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
    res = Organisation.query.options(load_only(Organisation.name)).filter(Organisation.id == organisation_id).one()
    return {"name": res.name}, 200


@organisation_api.route("/v1", strict_slashes=False)
@swag_from("../swagger/public/paths/get_collaborations_by_organisation.yml")
@json_endpoint
def api_organisation_details():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation
    api_key = request_context.get("external_api_key")
    for collaboration in organisation.collaborations:
        collaboration.groups
        collaboration.tags
        collaboration.units
        collaboration.services
        collaboration.collaboration_memberships
        for collaboration_membership in collaboration.collaboration_memberships:
            collaboration_membership.user
        for group in collaboration.groups:
            group.collaboration_memberships

    json_organisation = jsonify(organisation).json
    if api_key.units:
        api_key_unit_identifiers = [unit.id for unit in api_key.units]

        # remove the collaborations without units or no matching units
        def valid_co(collaboration_json):
            co_unit_identifiers = [unit["id"] for unit in collaboration_json.get("units", [])]
            if not co_unit_identifiers:
                return False
            return all(api_key_unit_id in api_key_unit_identifiers for api_key_unit_id in co_unit_identifiers)

        valid_collaborations = [co for co in json_organisation.get("collaborations", []) if valid_co(co)]
        json_organisation["collaborations"] = valid_collaborations
        json_organisation["collaborations_count"] = len(valid_collaborations)

    for json_collaboration in json_organisation.get("collaborations", []):
        for group in json_collaboration.get("groups", []):
            group["collaboration_memberships"] = [cm["user_id"] for cm in group.get("collaboration_memberships", [])]
    json_organisation["units"] = [unit.name for unit in organisation.units]
    for collaboration in json_organisation["collaborations"]:
        collaboration["units"] = [unit["name"] for unit in collaboration["units"]]
        collaboration["tags"] = [tag["tag_value"] for tag in collaboration["tags"]]
        for collaboration_membership in collaboration.get("collaboration_memberships", []):
            User.translate_user_mfa_attributes(collaboration_membership.get("user"))
    return json_organisation, 200


@organisation_api.route("/<organisation_id>", strict_slashes=False)
@json_endpoint
def organisation_by_id(organisation_id):
    query = Organisation.query \
        .options(selectinload(Organisation.organisation_memberships)
                 .selectinload(OrganisationMembership.user)) \
        .options(selectinload(Organisation.organisation_invitations)
                 .selectinload(OrganisationInvitation.user)) \
        .options(selectinload(Organisation.organisation_invitations)
                 .selectinload(OrganisationInvitation.units)) \
        .options(selectinload(Organisation.api_keys)) \
        .options(selectinload(Organisation.services)) \
        .options(selectinload(Organisation.collaboration_requests)
                 .selectinload(CollaborationRequest.requester)) \
        .options(selectinload(Organisation.collaborations)
                 .selectinload(Collaboration.tags)) \
        .options(selectinload(Organisation.collaborations)
                 .selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.requester)) \
        .options(selectinload(Organisation.collaborations)
                 .selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.service)) \
        .filter(Organisation.id == organisation_id)

    api_call = request_context.is_authorized_api_call
    is_admin = is_application_admin()
    if not api_call and not is_admin:
        user_id = current_user_id()
        query = query \
            .join(Organisation.organisation_memberships) \
            .join(OrganisationMembership.user) \
            .filter(OrganisationMembership.user_id == user_id)

    organisation = query.one()
    if not api_call and not is_admin and organisation.units:
        user_id = current_user_id()
        organisation_membership = next(m for m in organisation.organisation_memberships if m.user_id == user_id)
        if organisation_membership.role != "admin":
            manager_unit_identifiers = [unit.id for unit in organisation_membership.units]
            organisation_json = jsonify(organisation).json

            def collaboration_allowed(collaboration):
                if manager_unit_identifiers:
                    collaboration_has_units = "units" in collaboration and collaboration["units"]
                    # one of units of the manager has to match one of the units of the collaboration
                    co_units = [unit["id"] for unit in collaboration["units"]] if collaboration_has_units else []
                    return bool([id for id in manager_unit_identifiers if id in co_units])
                return True

            collaborations = [co for co in organisation_json["collaborations"] if collaboration_allowed(co)]
            collaboration_requests = [co for co in organisation_json["collaboration_requests"] if
                                      collaboration_allowed(co)]
            organisation_json["collaborations"] = collaborations
            organisation_json["collaboration_requests"] = collaboration_requests
            return organisation_json, 200

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
    return organisation_by_user_schac_home(), 200


@organisation_api.route("/identity_provider_display_name", strict_slashes=False)
@json_endpoint
def identity_provider_display_name():
    user_id = query_param("user_id", required=False, default=current_user_id())
    user = User.query.filter(User.id == user_id).one()
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

    organisation = db.session.get(Organisation, data["organisation_id"])
    confirm_organisation_admin(organisation.id)

    user = db.session.get(User, current_user_id())
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

    organisation = db.session.get(Organisation, organisation_id)
    user = db.session.get(User, current_user_id())

    valid_units = validate_units(data, organisation)

    duplicate_invitations = [i.invitee_email for i in
                             organisation_invitations_by_email(administrators, organisation_id)]
    if duplicate_invitations:
        raise BadRequest(f"Duplicate email invitations: {duplicate_invitations}")

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=generate_token(),
                                            intended_role=intended_role,
                                            message=message,
                                            units=valid_units if intended_role == "manager" else [],
                                            invitee_email=administrator,
                                            organisation=organisation,
                                            user=user,
                                            expiry_date=default_expiry_date(json_dict=data),
                                            created_by=user.uid)
        db.session.add(invitation)
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

    res = save(Organisation, custom_json=data, allow_child_cascades=False,
               allowed_child_collections=["schac_home_organisations", "units"])
    user = db.session.get(User, current_user_id())
    organisation = res[0]

    for administrator in administrators:
        invitation = OrganisationInvitation(hash=generate_token(),
                                            message=message,
                                            invitee_email=administrator,
                                            organisation_id=organisation.id,
                                            user_id=user.id,
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

    organisation = db.session.get(Organisation, data["id"])
    if organisation.short_name != data["short_name"]:
        for collaboration in organisation.collaborations:
            collaboration.global_urn = f"{data['short_name']}:{collaboration.short_name}"
            db.session.merge(collaboration)
            for group in collaboration.groups:
                group.global_urn = f"{data['short_name']}:{collaboration.short_name}:{group.short_name}"
                db.session.merge(group)

    if not is_application_admin() and organisation.services_restricted:
        data["services_restricted"] = True

    approval_changed = organisation.service_connection_requires_approval != data["service_connection_requires_approval"]
    if not is_application_admin() and approval_changed:
        data["service_connection_requires_approval"] = organisation.service_connection_requires_approval

    # Corner case: user removed name and added the exact same name again, prevent duplicate entry
    if "schac_home_organisations" in data:
        existing_names = [sho.name for sho in organisation.schac_home_organisations]
        if len([sho for sho in data["schac_home_organisations"] if
                not sho.get("id") and sho["name"] in existing_names]) > 0:
            organisation.schac_home_organisations.clear()

    # Corner case: user removed name and added the exact same name again, prevent duplicate entry
    if "units" in data:
        existing_names = [unit.name for unit in organisation.units]
        if len([unit for unit in data["units"] if
                not unit.get("id") and unit["name"] in existing_names]) > 0:
            organisation.units.clear()

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return update(Organisation, custom_json=data, allow_child_cascades=False,
                  allowed_child_collections=["schac_home_organisations", "units"])


@organisation_api.route("/<organisation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_organisation(organisation_id):
    confirm_write_access()

    broadcast_organisation_deleted(organisation_id)
    return delete(Organisation, organisation_id)


@organisation_api.route("/<organisation_id>/users", methods=["GET"], strict_slashes=False)
@json_endpoint
def search_users(organisation_id):
    organisation_id = int(organisation_id)
    confirm_organisation_admin_or_manager(organisation_id)
    wildcard = f"%{query_param('q')}%"
    conditions = [User.name.ilike(wildcard),
                  User.username.ilike(wildcard),
                  User.eduperson_principal_name.ilike(wildcard),
                  User.email.ilike(wildcard)]
    users = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.organisation) \
        .filter(Organisation.id == organisation_id) \
        .filter(or_(*conditions)) \
        .all()
    return [user.allowed_attr_view([organisation_id], False) for user in users], 200


@organisation_api.route("/<organisation_id>/invites", methods=["GET"], strict_slashes=False)
@json_endpoint
def search_invites(organisation_id):
    confirm_organisation_admin_or_manager(organisation_id)
    wildcard = f"%{query_param('q')}%"
    invitations = Invitation \
        .query \
        .join(Invitation.collaboration).join(Collaboration.organisation) \
        .filter(Organisation.id == organisation_id) \
        .filter(Invitation.invitee_email.ilike(wildcard)) \
        .all()
    invitations_json = jsonify(invitations).json
    for invitation_json in invitations_json:
        co = [invitation for invitation in invitations if invitation.id == invitation_json["id"]][0].collaboration
        invitation_json["collaboration_memberships"] = [{"collaboration": {"id": co.id, "name": co.name}}]
    return invitations_json, 200
