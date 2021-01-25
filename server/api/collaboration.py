# -*- coding: future_fstrings -*-
import uuid
from secrets import token_urlsafe

from flask import Blueprint, jsonify, request as current_request, current_app, g as request_context
from munch import munchify
from sqlalchemy import text, or_, func, bindparam, String
from sqlalchemy.orm import aliased, load_only, selectinload
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.auth.security import confirm_collaboration_admin, is_application_admin, \
    current_user_id, confirm_collaboration_member, confirm_authorized_api_call, \
    confirm_allow_impersonation, confirm_organisation_admin_or_manager
from server.db.db import db
from server.db.defaults import default_expiry_date, full_text_search_autocomplete_limit, cleanse_short_name
from server.db.domain import Collaboration, CollaborationMembership, JoinRequest, Group, User, Invitation, \
    Organisation, Service, ServiceConnectionRequest, SchacHomeOrganisation
from server.db.models import update, save, delete
from server.logger.context_logger import ctx_logger
from server.mail import mail_collaboration_invitation

collaboration_api = Blueprint("collaboration_api", __name__, url_prefix="/api/collaborations")


def _del_non_disclosure_info(collaboration, json_collaboration):
    for cm in json_collaboration["collaboration_memberships"]:
        if not collaboration.disclose_email_information:
            del cm["user"]["email"]
        if not collaboration.disclose_member_information:
            del cm["user"]


@collaboration_api.route("/find_by_identifier", strict_slashes=False)
@json_endpoint
def collaboration_by_identifier():
    identifier = query_param("identifier")

    collaboration = Collaboration. \
        query \
        .outerjoin(Collaboration.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user) \
        .options(selectinload(Collaboration.organisation)) \
        .options(selectinload(Collaboration.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .filter(Collaboration.identifier == identifier).one()
    admins = [m.user.name for m in collaboration.collaboration_memberships if m.role == "admin"]
    services = [{"name": s.name, "logo": s.logo} for s in collaboration.services]
    return {"id": collaboration.id, "name": collaboration.name, "admins": admins,
            "member_count": len(collaboration.collaboration_memberships),
            "services": services,
            "organisation": {"name": collaboration.organisation.name},
            "group_count": len(collaboration.groups), "website_url": collaboration.website_url,
            "disable_join_requests": collaboration.disable_join_requests, "logo": collaboration.logo,
            "description": collaboration.description,
            "disclose_member_information": collaboration.disclose_member_information,
            "accepted_user_policy": collaboration.accepted_user_policy}, 200


@collaboration_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    organisation_id = int(query_param("organisation_id"))
    existing_collaboration = query_param("existing_collaboration", required=False, default="")
    res = _do_name_exists(name, organisation_id, existing_collaboration)
    return res, 200


def _do_name_exists(name, organisation_id, existing_collaboration=""):
    coll = Collaboration.query.options(load_only("id")) \
        .filter(func.lower(Collaboration.name) == func.lower(name)) \
        .filter(func.lower(Collaboration.organisation_id) == organisation_id) \
        .filter(func.lower(Collaboration.name) != func.lower(existing_collaboration)) \
        .first()
    return coll is not None


@collaboration_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def short_name_exists():
    name = query_param("short_name")
    organisation_id = int(query_param("organisation_id"))
    existing_collaboration = query_param("existing_collaboration", required=False, default="")
    res = _do_short_name_exists(name, organisation_id, existing_collaboration)
    return res, 200


def _do_short_name_exists(name, organisation_id, existing_collaboration=""):
    coll = Collaboration.query.options(load_only("id")) \
        .filter(func.lower(Collaboration.short_name) == func.lower(name)) \
        .filter(func.lower(Collaboration.organisation_id) == organisation_id) \
        .filter(func.lower(Collaboration.short_name) != func.lower(existing_collaboration)) \
        .first()
    return coll is not None


@collaboration_api.route("/may_request_collaboration", strict_slashes=False)
@json_endpoint
def may_request_collaboration():
    user = User.query.get(current_user_id())
    sho = user.schac_home_organisation
    if not sho:
        return False, 200
    return Organisation.query \
               .join(Organisation.schac_home_organisations) \
               .filter(SchacHomeOrganisation.name == sho).count() > 0, 200


@collaboration_api.route("/all", strict_slashes=False)
@json_endpoint
def collaboration_all():
    confirm_authorized_api_call()
    collaborations = Collaboration.query \
        .options(selectinload(Collaboration.organisation)) \
        .all()
    return collaborations, 200


@collaboration_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    confirm_allow_impersonation()

    res = []
    q = query_param("q")
    if q and len(q):
        base_query = "SELECT id, name, description, organisation_id FROM collaborations "
        not_wild_card = "*" not in q
        if not_wild_card:
            q = replace_full_text_search_boolean_mode_chars(q)
            base_query += f"WHERE MATCH (name, description) AGAINST (:q IN BOOLEAN MODE) " \
                          f"AND id > 0 ORDER BY NAME LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query if not_wild_card else base_query + " ORDER BY NAME")
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)
        res = [{"id": row[0], "name": row[1], "description": row[2], "organisation_id": row[3]} for row in result_set]
    return res, 200


# Call for LSC to get all members based on the identifier of the Collaboration
@collaboration_api.route("/members", strict_slashes=False)
@json_endpoint
def members():
    confirm_authorized_api_call()

    identifier = query_param("identifier")
    collaboration_group = aliased(Collaboration)
    collaboration_membership = aliased(Collaboration)

    users = User.query \
        .options(load_only("uid", "name")) \
        .join(User.collaboration_memberships) \
        .join(collaboration_membership, CollaborationMembership.collaboration) \
        .join(CollaborationMembership.groups) \
        .join(collaboration_group, Group.collaboration) \
        .filter(or_(collaboration_group.identifier == identifier,
                    collaboration_membership.identifier == identifier)) \
        .all()
    return users, 200


@collaboration_api.route("/", strict_slashes=False)
@json_endpoint
def my_collaborations_lite():
    include_services = query_param("includeServices", False)
    user_id = current_user_id()
    query = Collaboration.query \
        .join(Collaboration.collaboration_memberships) \
        .options(selectinload(Collaboration.organisation))
    if include_services:
        query = query \
            .options(selectinload(Collaboration.services).selectinload(Service.allowed_organisations))

    collaborations = query \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return collaborations, 200


@collaboration_api.route("/lite/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_lite_by_id(collaboration_id):
    confirm_collaboration_member(collaboration_id)

    collaboration = Collaboration.query \
        .options(selectinload(Collaboration.organisation).selectinload(Organisation.services)) \
        .options(selectinload(Collaboration.collaboration_memberships).selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.services)) \
        .filter(Collaboration.id == collaboration_id).one()

    if not collaboration.disclose_member_information or not collaboration.disclose_email_information:
        json_collaboration = jsonify(collaboration).json
        _del_non_disclosure_info(collaboration, json_collaboration)
        for gr in json_collaboration["groups"]:
            _del_non_disclosure_info(collaboration, gr)
        return json_collaboration, 200

    return collaboration, 200


@collaboration_api.route("/access_allowed/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_access_allowed(collaboration_id):
    try:
        confirm_collaboration_admin(collaboration_id)
        return {"access": "full"}, 200
    except Forbidden:
        confirm_collaboration_member(collaboration_id)
        return {"access": "lite"}, 200


@collaboration_api.route("/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_by_id(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    collaboration = Collaboration.query \
        .options(selectinload(Collaboration.organisation).selectinload(Organisation.services)) \
        .options(selectinload(Collaboration.collaboration_memberships).selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.invitations)) \
        .options(selectinload(Collaboration.invitations).selectinload(Invitation.user)) \
        .options(selectinload(Collaboration.join_requests).selectinload(JoinRequest.user)) \
        .options(selectinload(Collaboration.services)) \
        .options(selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.service)) \
        .options(selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.requester)) \
        .filter(Collaboration.id == collaboration_id).one()

    return collaboration, 200


@collaboration_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def collaboration_invites():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    administrators = data.get("administrators", [])
    message = data.get("message", None)
    intended_role = data.get("intended_role", "member")
    group_ids = data.get("groups", [])

    groups = Group.query \
        .filter(Group.collaboration_id == collaboration_id) \
        .filter(Group.id.in_(group_ids)) \
        .all()

    collaboration = Collaboration.query.get(collaboration_id)
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration=collaboration, user=user, groups=groups,
                                intended_role=intended_role, expiry_date=default_expiry_date(json_dict=data),
                                created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link
        }, collaboration, [administrator])
    return None, 201


@collaboration_api.route("/invites-preview", methods=["POST"], strict_slashes=False)
@json_endpoint
def collaboration_invites_preview():
    data = current_request.get_json()
    message = data.get("message", None)
    intended_role = data.get("intended_role", "member")

    collaboration = Collaboration.query.get(int(data["collaboration_id"]))
    confirm_collaboration_admin(collaboration.id)

    user = User.query.get(current_user_id())
    invitation = munchify({
        "user": user,
        "collaboration": collaboration,
        "intended_role": intended_role,
        "message": message,
        "hash": token_urlsafe(),
        "expiry_date": default_expiry_date(data)
    })
    html = mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link,

    }, collaboration, [], preview=True)
    return {"html": html}, 201


@collaboration_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration():
    data = current_request.get_json()
    if "organisation_id" in data:
        confirm_organisation_admin_or_manager(data["organisation_id"])
        organisation = Organisation.query.get(data["organisation_id"])
        user = User.query.get(current_user_id())
    else:
        raise BadRequest("No organisation_id in POST data")
    current_user_admin = data.get("current_user_admin", False)
    if "current_user_admin" in data:
        del data["current_user_admin"]
    res = do_save_collaboration(data, organisation, user, current_user_admin)
    return res


@collaboration_api.route("/v1", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration_api():
    data = current_request.get_json()
    if "external_api_organisation" in request_context:
        organisation = request_context.external_api_organisation
        admins = list(filter(lambda mem: mem.role == "admin", organisation.organisation_memberships))
        user = admins[0].user if len(admins) > 0 else User.query.filter(
            User.uid == current_app.app_config.admin_users[0].uid).one()
        data["organisation_id"] = organisation.id
    else:
        raise Forbidden("Not associated with an API key")

    res = do_save_collaboration(data, organisation, user, current_user_admin=False)
    return res


@collaboration_api.route("/v1/restricted", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_restricted_collaboration():
    api_user = "api_user" in request_context
    if not api_user or (api_user and "restricted_co" not in request_context.api_user.scopes):
        raise Forbidden("Not a valid API user")

    data = current_request.get_json()
    administrator = data["administrator"]
    admin = User.query.filter(User.username == administrator).first()
    if not admin:
        raise BadRequest(f"Administrator {administrator} is not a valid user")

    restricted_co_config = current_app.app_config.restricted_co

    organisation = None
    logger = ctx_logger("collaboration_api_restricted")

    if admin.schac_home_organisation:
        organisation = Organisation.query \
            .join(Organisation.schac_home_organisations) \
            .filter(SchacHomeOrganisation.name == admin.schac_home_organisation) \
            .first()
    else:
        logger.info(f"Admin user {admin.username} has no schac_home_organisation, fallback to configured default org")

    if not organisation:
        organisation = Organisation.query \
            .join(Organisation.schac_home_organisations) \
            .filter(SchacHomeOrganisation.name == restricted_co_config.default_organisation) \
            .first()

    if not organisation:
        raise BadRequest(f"Default organisation for restricted co "
                         f"{restricted_co_config.default_organisation} does not exists")

    data["organisation_id"] = organisation.id
    data["services_restricted"] = True

    # do_save_collaboration sanitizes the JSON so we need to define upfront
    connected_services = data.get("connected_services")

    res = do_save_collaboration(data, organisation, admin, current_user_admin=True)
    collaboration = res[0]

    if connected_services:
        applied_connected_services = []
        services = Service.query.filter(Service.entity_id.in_(connected_services)).all()
        for service in services:
            if service.white_listed or service.entity_id in restricted_co_config.services_white_list:
                collaboration.services.append(service)
                applied_connected_services.append(service.entity_id)

        db.session.merge(collaboration)

    return collaboration, 201


def do_save_collaboration(data, organisation, user, current_user_admin=True):
    data["status"] = "active"
    _validate_collaboration(data, organisation)

    administrators = data.get("administrators", [])
    message = data.get("message", None)

    data["identifier"] = str(uuid.uuid4())
    res = save(Collaboration, custom_json=data, allow_child_cascades=False)

    administrators = list(filter(lambda admin: admin != user.email, administrators))
    collaboration = res[0]
    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration_id=collaboration.id, user=user, intended_role="admin",
                                expiry_date=default_expiry_date(),
                                created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link
        }, collaboration, [administrator])

    if current_user_admin:
        admin_collaboration_membership = CollaborationMembership(role="admin", user_id=user.id,
                                                                 collaboration_id=collaboration.id,
                                                                 created_by=user.uid, updated_by=user.uid)
        db.session.merge(admin_collaboration_membership)
    return res


def _validate_collaboration(data, organisation, new_collaboration=True):
    cleanse_short_name(data)
    if _do_name_exists(data["name"], organisation.id,
                       existing_collaboration="" if new_collaboration else data["name"]):
        raise BadRequest(f"Collaboration with name '{data['name']}' already exists within "
                         f"organisation '{organisation.name}'.")
    if _do_short_name_exists(data["short_name"], organisation.id,
                             existing_collaboration="" if new_collaboration else data["short_name"]):
        raise BadRequest(f"Collaboration with short_name '{data['short_name']}' already exists within "
                         f"organisation '{organisation.name}'.")
    _assign_global_urn(data["organisation_id"], data)


def _assign_global_urn(organisation_id, data):
    organisation = Organisation.query.get(organisation_id)
    assign_global_urn_to_collaboration(organisation, data)


def assign_global_urn_to_collaboration(organisation, data):
    data["global_urn"] = f"{organisation.short_name}:{data['short_name']}"


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    data = current_request.get_json()
    confirm_collaboration_admin(data["id"])

    organisation = Organisation.query.get(data["organisation_id"])
    _validate_collaboration(data, organisation, new_collaboration=False)

    collaboration = Collaboration.query.get(data["id"])
    if collaboration.short_name != data["short_name"]:
        for group in collaboration.groups:
            group.global_urn = f"{organisation.short_name}:{data['short_name']}:{group.short_name}"
            db.session.merge(group)

    if not is_application_admin() and "services_restricted" in data:
        del data["services_restricted"]

    # For updating references like services, groups, memberships there are more fine-grained API methods
    return update(Collaboration, custom_json=data, allow_child_cascades=False)


@collaboration_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(id):
    confirm_collaboration_admin(id)
    return delete(Collaboration, id)
