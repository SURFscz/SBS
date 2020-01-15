# -*- coding: future_fstrings -*-
import uuid
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, current_app, g as request_context
from munch import munchify
from sqlalchemy import text, or_, func, bindparam, String
from sqlalchemy.orm import aliased, load_only, contains_eager, joinedload
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.auth.security import confirm_collaboration_admin, confirm_organisation_admin, is_application_admin, \
    current_user_id, confirm_collaboration_member, confirm_authorized_api_call, \
    confirm_allow_impersonation
from server.db.domain import Collaboration, CollaborationMembership, JoinRequest, Group, User, Invitation, \
    Organisation
from server.db.db import db
from server.db.defaults import default_expiry_date, full_text_search_autocomplete_limit, cleanse_short_name
from server.db.models import update, save, delete
from server.mail import mail_collaboration_invitation

collaboration_api = Blueprint("collaboration_api", __name__, url_prefix="/api/collaborations")


@collaboration_api.route("/find_by_name", strict_slashes=False)
@json_endpoint
def collaboration_by_name():
    name = query_param("name")

    collaboration = Collaboration. \
        query \
        .outerjoin(Collaboration.collaboration_memberships) \
        .outerjoin(CollaborationMembership.user) \
        .options(contains_eager(Collaboration.collaboration_memberships)
                 .contains_eager(CollaborationMembership.user)) \
        .filter(Collaboration.name == name).one()

    admins = list(filter(lambda m: m.role == "admin", collaboration.collaboration_memberships))
    admin_email = admins[0].user.email if len(admins) > 0 else None

    return {"id": collaboration.id, "name": collaboration.name, "admin_email": admin_email,
            "disable_join_requests": collaboration.disable_join_requests,
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


@collaboration_api.route("/all", strict_slashes=False)
@json_endpoint
def collaboration_all():
    confirm_authorized_api_call()
    collaborations = Collaboration.query.all()
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
                          f"AND id > 0 LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query)
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)
        res = [{"id": row[0], "name": row[1], "description": row[2], "organisation_id": row[3]} for row in result_set]
    return res, 200


@collaboration_api.route("services/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_services_by_id(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    query = Collaboration.query \
        .outerjoin(Collaboration.services) \
        .join(Collaboration.organisation) \
        .options(contains_eager(Collaboration.services)) \
        .options(contains_eager(Collaboration.organisation))

    include_memberships = query_param("include_memberships", required=False, default=False)
    if include_memberships:
        query = query \
            .outerjoin(Collaboration.invitations) \
            .outerjoin(Collaboration.collaboration_memberships) \
            .outerjoin(CollaborationMembership.user) \
            .options(contains_eager(Collaboration.invitations)) \
            .options(contains_eager(Collaboration.collaboration_memberships)
                     .contains_eager(CollaborationMembership.user))

    collaboration = query.filter(Collaboration.id == collaboration_id).one()

    return collaboration, 200


@collaboration_api.route("groups/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_groups_by_id(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    query = Collaboration.query \
        .outerjoin(Collaboration.groups) \
        .options(contains_eager(Collaboration.groups))
    collaboration = query.filter(Collaboration.id == collaboration_id).one()

    return collaboration, 200


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


@collaboration_api.route("/my_lite", strict_slashes=False)
@json_endpoint
def my_collaborations_lite():
    user_id = current_user_id()
    res = Collaboration.query \
        .join(Collaboration.collaboration_memberships) \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.services) \
        .outerjoin(CollaborationMembership.groups) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.services)) \
        .options(contains_eager(Collaboration.collaboration_memberships).contains_eager(CollaborationMembership.groups)) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
    return res, 200


@collaboration_api.route("/lite/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_lite_by_id(collaboration_id):
    confirm_collaboration_member(collaboration_id)

    collaboration = Collaboration.query \
        .join(Collaboration.organisation) \
        .options(contains_eager(Collaboration.organisation)) \
        .filter(Collaboration.id == collaboration_id).one()
    return collaboration, 200


@collaboration_api.route("/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_by_id(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    query = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.groups) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(Collaboration.services) \
        .options(contains_eager(Collaboration.groups)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.services))

    if not request_context.is_authorized_api_call and not is_application_admin():
        user_id = current_user_id()
        query = query \
            .join(Collaboration.collaboration_memberships) \
            .filter(CollaborationMembership.user_id == user_id)

    collaboration = query.filter(Collaboration.id == collaboration_id).one()

    for membership in collaboration.collaboration_memberships:
        membership.user

    return collaboration, 200


@collaboration_api.route("/", strict_slashes=False)
@json_endpoint
def my_collaborations():
    user_id = current_user_id()
    query = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.groups) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(Collaboration.services) \
        .options(joinedload(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.groups)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.services)) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id)

    if not is_application_admin():
        query = query.filter(CollaborationMembership.role == "admin")

    res = query.all()
    return res, 200


@collaboration_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def collaboration_invites():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None
    intended_role = data["intended_role"] if "intended_role" in data else "member"
    group_ids = data["groups"] if "groups" in data else []
    groups = Group.query \
        .filter(Group.collaboration_id == collaboration_id) \
        .filter(Group.id.in_(group_ids)) \
        .all()

    collaboration = Collaboration.query.get(collaboration_id)
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration_id=collaboration_id, user_id=user.id, groups=groups,
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
    message = data["message"] if "message" in data else None
    intended_role = data["intended_role"] if "intended_role" in data else "member"

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
    data["status"] = "active"
    if "organisation_id" in data:
        confirm_organisation_admin(data["organisation_id"])
        user = User.query.get(current_user_id())
        _assign_global_urn(data["organisation_id"], data)
    elif "external_api_organisation" in request_context:
        organisation = request_context.external_api_organisation
        admins = list(filter(lambda mem: mem.role == "admin", organisation.organisation_memberships))
        assign_global_urn_to_organisation(organisation, data)
        user = admins[0].user if len(admins) > 0 else User.query.filter(
            User.uid == current_app.app_config.admin_users[0].uid).one()
        data["organisation_id"] = organisation.id
        if _do_name_exists(data["name"], organisation.id):
            return {"status": 400,
                    "error": "duplicate entry",
                    "message": f"Collaboration with name '{data['name']}' already exists within "
                               f"organisation '{organisation.name}'."}, 400
        if _do_short_name_exists(data["short_name"], organisation.id):
            return {"status": 400,
                    "error": "duplicate entry",
                    "message": f"Collaboration with short_name '{data['short_name']}' already exists within "
                               f"organisation '{organisation.name}'."}, 400
    else:
        raise BadRequest("Neither organization in POST data nor associated with an API key")

    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None
    data["identifier"] = str(uuid.uuid4())
    cleanse_short_name(data)

    res = save(Collaboration, custom_json=data)

    administrators = list(filter(lambda admin: admin != user.email, administrators))
    collaboration = res[0]
    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration_id=collaboration.id, user_id=user.id, intended_role="admin",
                                expiry_date=default_expiry_date(),
                                created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, collaboration, [administrator])

    admin_collaboration_membership = CollaborationMembership(role="admin", user_id=user.id,
                                                             collaboration_id=collaboration.id,
                                                             created_by=user.uid, updated_by=user.uid)
    db.session.merge(admin_collaboration_membership)
    return res


def _assign_global_urn(organisation_id, data):
    organisation = Organisation.query \
        .filter(Organisation.id == organisation_id).one()
    assign_global_urn_to_organisation(organisation, data)


def assign_global_urn_to_organisation(organisation, data):
    data["global_urn"] = f"{organisation.short_name}:{data['short_name']}"


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    data = current_request.get_json()
    confirm_collaboration_admin(data["id"])

    cleanse_short_name(data)
    _assign_global_urn(data["organisation_id"], data)
    # For updating references like services, groups, memberships there are more fine-grained API methods
    return update(Collaboration, custom_json=data, allow_child_cascades=False)


@collaboration_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(id):
    confirm_collaboration_admin(id)
    return delete(Collaboration, id)
