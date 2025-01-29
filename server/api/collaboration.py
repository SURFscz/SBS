import base64
import re
import uuid
from datetime import datetime, timedelta, timezone

from flasgger import swag_from
from flask import Blueprint, jsonify, request as current_request, current_app, g as request_context
from munch import munchify
from sqlalchemy import text, or_, func, bindparam, String
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import aliased, load_only, selectinload
from werkzeug.exceptions import BadRequest, Forbidden, MethodNotAllowed, NotFound

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars, emit_socket
from server.api.exceptions import APIBadRequest
from server.api.invitation import email_re, invitations_by_email
from server.api.service_group import create_service_groups
from server.api.unit import validate_units
from server.auth.secrets import generate_token
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_collaboration_member, \
    confirm_authorized_api_call, \
    confirm_allow_impersonation, confirm_organisation_admin_or_manager, confirm_external_api_call, \
    is_organisation_admin_or_manager, is_application_admin, confirm_organisation_api_collaboration, \
    confirm_write_access, has_org_manager_unit_access, is_admin_user, \
    confirm_service_manager, confirm_api_key_unit_access
from server.db.activity import update_last_activity_date
from server.db.db import db
from server.db.defaults import (default_expiry_date, full_text_search_autocomplete_limit, cleanse_short_name,
                                STATUS_ACTIVE, STATUS_EXPIRED, STATUS_SUSPENDED, valid_uri_attributes,
                                generate_short_name, valid_tag_label)
from server.db.domain import Collaboration, CollaborationMembership, JoinRequest, Group, User, Invitation, \
    Organisation, Service, ServiceConnectionRequest, SchacHomeOrganisation, Tag, ServiceGroup, ServiceMembership, Unit
from server.db.image import transform_image
from server.db.logo_mixin import logo_url
from server.db.models import update, save, delete, unique_model_objects
from server.mail import mail_collaboration_invitation
from server.scim.events import broadcast_collaboration_changed, broadcast_collaboration_deleted
from server.tools import dt_now

collaboration_api = Blueprint("collaboration_api", __name__, url_prefix="/api/collaborations")

base_collaboration_query = """
    SELECT c.id, c.name, c.uuid4, c.expiry_date, c.last_activity_date,
    (SELECT GROUP_CONCAT(DISTINCT u.name) FROM units u
    INNER JOIN collaboration_units cou ON cou.unit_id = u.id
    WHERE cou.collaboration_id = c.id) AS names,
    (SELECT GROUP_CONCAT(DISTINCT t.tag_value) FROM tags t
    INNER JOIN collaboration_tags ct ON ct.tag_id = t.id WHERE ct.collaboration_id = c.id) AS tag_values,
    (SELECT COUNT(id) FROM collaboration_memberships cm WHERE cm.collaboration_id = c.id) AS member_count,
    org.name FROM collaborations c INNER JOIN organisations org ON org.id = c.organisation_id
"""


def _result_set_to_collaborations(result_set):
    return [{"id": row[0], "name": row[1], "logo": f"{logo_url('collaborations', row[2])}",
             "expiry_date": row[3], "last_activity_date": row[4],
             "units": [{"name": v} for v in row[5].split(",")] if row[5] else [],
             "tags": [{"tag_value": v} for v in row[6].split(",")] if row[6] else [],
             "collaboration_memberships_count": row[7],
             "organisation": {"name": row[8]}} for row in result_set]


def _del_non_disclosure_info(collaboration, json_collaboration):
    for cm in json_collaboration["collaboration_memberships"]:
        if not collaboration.disclose_email_information and not cm["role"] == "admin":
            del cm["user"]["email"]
        if not collaboration.disclose_member_information and not cm["role"] == "admin":
            del cm["user"]
    if "groups" in json_collaboration:
        for gr in json_collaboration["groups"]:
            _del_non_disclosure_info(collaboration, gr)


def _reconcile_tags(collaboration: Collaboration, tags, is_external_api=False):
    # tags is a list of strings
    if is_external_api or is_application_admin() or is_organisation_admin_or_manager(collaboration.organisation_id):
        # find delta, e.g. which tags to remove and which tags to add
        org_tags = collaboration.organisation.tags
        existing_tags = collaboration.tags

        # cleanup tags received from client
        tags = [t for t in tags if valid_tag_label(t)]

        def is_new_tag(label, persisted_tags):
            return label not in [t.tag_value for t in persisted_tags]

        new_tags = [t for t in tags if is_new_tag(t, existing_tags) and is_new_tag(t, org_tags)]
        added_existing_tags = [t for t in tags if is_new_tag(t, existing_tags) and not is_new_tag(t, org_tags)]
        removed_tags = [t for t in existing_tags if t.tag_value not in tags]

        for tag in removed_tags:
            tag.collaborations.remove(collaboration)
            # We delete orphan tags
            if not tag.collaborations:
                db.session.delete(tag)
        for tag in added_existing_tags:
            tag = next((t for t in org_tags if t.tag_value == tag), None)
            tag.collaborations.append(collaboration)
        for tag in new_tags:
            new_tag = save(Tag, {"tag_value": tag, "organisation_id": collaboration.organisation_id},
                           allow_child_cascades=False)[0]
            new_tag.collaborations.append(collaboration)
    return tags


def _get_collaboration_membership(co_identifier, user_uid) -> CollaborationMembership:
    organisation = request_context.external_api_organisation
    membership = CollaborationMembership.query \
        .join(CollaborationMembership.user) \
        .join(CollaborationMembership.collaboration) \
        .filter(Collaboration.identifier == co_identifier) \
        .filter(User.uid == user_uid) \
        .one()
    if not organisation or organisation.id != membership.collaboration.organisation_id:
        raise Forbidden()
    return membership


def _tag_identifiers(collaboration_id):
    collaboration = Collaboration.query.filter(Collaboration.id == int(collaboration_id)).one()
    return [tag.id for tag in collaboration.tags]


def _delete_orphan_tags(tag_identifiers):
    # We delete orphan tags, but need to look them up to prevent Parent instance is not bound to a Session
    for tag_pk in tag_identifiers:
        tag = Tag.query.filter(Tag.id == tag_pk).first()
        if tag and not tag.collaborations:
            db.session.delete(tag)


def _unit_from_name(unit_name: str, organisation_id: int):
    unit = Unit.query.filter(Unit.name == unit_name, Unit.organisation_id == organisation_id).first()
    if not unit:
        raise BadRequest(f"Unit with name {unit_name} and organisation {organisation_id} does not exists")
    return unit


@collaboration_api.route("/admins/<service_id>", strict_slashes=False)
@json_endpoint
def collaboration_admins(service_id):
    confirm_service_manager(service_id)
    service = db.session.get(Service, service_id)
    return {c.name: c.admin_emails() for c in unique_model_objects(service.collaborations)}, 200


@collaboration_api.route("/id_by_identifier", strict_slashes=False)
@json_endpoint
def id_by_identifier():
    identifier = query_param("identifier")
    coll = Collaboration.query \
        .options(load_only(Collaboration.id)) \
        .filter(Collaboration.identifier == identifier) \
        .one()

    return coll, 200


@collaboration_api.route("/find_by_identifier", strict_slashes=False)
@json_endpoint
def collaboration_by_identifier():
    identifier = query_param("identifier")

    collaboration = Collaboration.query \
        .options(selectinload(Collaboration.groups)) \
        .options(selectinload(Collaboration.services)) \
        .options(selectinload(Collaboration.organisation).selectinload(Organisation.services)) \
        .filter(Collaboration.identifier == identifier) \
        .one()

    return collaboration, 200


@collaboration_api.route("/v1/<co_identifier>", strict_slashes=False, methods=["GET"])
@swag_from("../swagger/public/paths/get_collaboration_by_identifier.yml")
@json_endpoint
def api_collaboration_by_identifier(co_identifier):
    try:
        collaboration = Collaboration.query \
            .outerjoin(Collaboration.collaboration_memberships) \
            .outerjoin(CollaborationMembership.user) \
            .options(selectinload(Collaboration.services)) \
            .options(selectinload(Collaboration.tags)) \
            .options(selectinload(Collaboration.groups).selectinload(Group.collaboration_memberships)) \
            .options(selectinload(Collaboration.collaboration_memberships)
                     .selectinload(CollaborationMembership.user)) \
            .filter(Collaboration.identifier == co_identifier) \
            .one()
        api_key = request_context.get("external_api_key")
        confirm_api_key_unit_access(api_key, collaboration)
    except NoResultFound:
        raise NotFound

    json_collaboration = jsonify(collaboration).json
    json_collaboration["units"] = [unit.name for unit in collaboration.units]
    json_collaboration["tags"] = [tag.tag_value for tag in collaboration.tags]
    return json_collaboration, 200


@collaboration_api.route("/v1/<co_identifier>", methods=["DELETE"], strict_slashes=False)
@swag_from("../swagger/public/paths/delete_collaboration.yml")
@json_endpoint
def delete_collaboration_api(co_identifier):
    api_key = request_context.get("external_api_key")
    collaboration = Collaboration.query.filter(Collaboration.identifier == co_identifier).one()
    confirm_api_key_unit_access(api_key, collaboration)

    collaboration_id = collaboration.id
    organisation_id = collaboration.organisation_id

    tag_identifiers = [tag.id for tag in collaboration.tags]

    broadcast_collaboration_deleted(collaboration_id)
    emit_socket(f"organisation_{organisation_id}")

    res = delete(Collaboration, collaboration_id)

    _delete_orphan_tags(tag_identifiers)

    return res


@collaboration_api.route("/v1/<co_identifier>/members", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/update_collaboration_membership.yml")
@json_endpoint
def api_update_user_from_collaboration(co_identifier):
    api_key = request_context.get("external_api_key")
    collaboration = Collaboration.query.filter(Collaboration.identifier == co_identifier).one()
    confirm_api_key_unit_access(api_key, collaboration)

    data = current_request.get_json()
    user_uid = data["uid"]
    user_role = data["role"]
    if user_role not in ["member", "admin"]:
        raise BadRequest(f"{user_role} is not a valid role")

    membership = _get_collaboration_membership(co_identifier, user_uid)
    membership.role = user_role

    db.session.merge(membership)
    db.session.commit()

    emit_socket(f"collaboration_{membership.collaboration.id}")
    broadcast_collaboration_changed(membership.collaboration.id)

    return membership, 201


@collaboration_api.route("/v1/<co_identifier>/members/<user_uid>", methods=["DELETE"], strict_slashes=False)
@swag_from("../swagger/public/paths/delete_collaboration_membership.yml")
@json_endpoint
def api_delete_user_from_collaboration(co_identifier, user_uid):
    api_key = request_context.get("external_api_key")
    collaboration = Collaboration.query.filter(Collaboration.identifier == co_identifier).one()
    confirm_api_key_unit_access(api_key, collaboration)

    membership = _get_collaboration_membership(co_identifier, user_uid)

    db.session.delete(membership)
    db.session.commit()

    emit_socket(f"collaboration_{membership.collaboration.id}")
    broadcast_collaboration_changed(membership.collaboration.id)

    return None, 204


@collaboration_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    # Regular members can create collaboration requests, soo access to all
    name = query_param("name")
    organisation_id = int(query_param("organisation_id"))
    existing_collaboration = query_param("existing_collaboration", required=False, default="")
    res = _do_name_exists(name, organisation_id, existing_collaboration)
    return res, 200


def _do_name_exists(name, organisation_id, existing_collaboration=""):
    coll = Collaboration.query.options(load_only(Collaboration.id)) \
        .filter(func.lower(Collaboration.name) == func.lower(name)) \
        .filter(func.lower(Collaboration.organisation_id) == organisation_id) \
        .filter(func.lower(Collaboration.name) != func.lower(existing_collaboration)) \
        .first()
    return coll is not None


@collaboration_api.route("/short_name_exists", strict_slashes=False)
@json_endpoint
def short_name_exists():
    # Regular members can create collaboration requests, soo access to all
    name = query_param("short_name")
    organisation_id = int(query_param("organisation_id"))
    existing_collaboration = query_param("existing_collaboration", required=False, default="")
    res = _do_short_name_exists(name, organisation_id, existing_collaboration)
    return res, 200


def _do_short_name_exists(name, organisation_id, existing_collaboration=""):
    coll = Collaboration.query.options(load_only(Collaboration.id)) \
        .filter(func.lower(Collaboration.short_name) == func.lower(name)) \
        .filter(func.lower(Collaboration.organisation_id) == organisation_id) \
        .filter(func.lower(Collaboration.short_name) != func.lower(existing_collaboration)) \
        .first()
    return coll is not None


@collaboration_api.route("/may_request_collaboration", strict_slashes=False)
@json_endpoint
def may_request_collaboration():
    user = db.session.get(User, current_user_id())
    organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
    return len(organisations) > 0, 200


@collaboration_api.route("/all", strict_slashes=False)
@json_endpoint
def collaboration_all():
    confirm_authorized_api_call()
    collaborations = Collaboration.query \
        .options(selectinload(Collaboration.organisation)) \
        .options(selectinload(Collaboration.tags)) \
        .all()
    return collaborations, 200


@collaboration_api.route("/all_optimized", strict_slashes=False)
@json_endpoint
def collaboration_all_optimized():
    confirm_authorized_api_call()
    sql = text(base_collaboration_query)
    with db.engine.connect() as conn:
        result_set = conn.execute(sql)
        return _result_set_to_collaborations(result_set), 200


@collaboration_api.route("/mine_optimized", strict_slashes=False)
@json_endpoint
def collaboration_mine_optimized():
    values = {"user_id": current_user_id()}
    sql = text(base_collaboration_query + """
        INNER JOIN collaboration_memberships cm_mine ON cm_mine.collaboration_id = c.id
        WHERE cm_mine.user_id = :user_id
    """)
    with db.engine.connect() as conn:
        result_set = conn.execute(sql, values)
        return _result_set_to_collaborations(result_set), 200


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
        with db.engine.connect() as conn:
            result_set = conn.execute(sql, {"q": f"{q}*"}) if not_wild_card else conn.execute(sql)
            res = [{"id": row[0], "name": row[1], "description": row[2], "organisation_id": row[3]} for row in
                   result_set]
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
        .options(load_only(User.uid, User.name)) \
        .join(User.collaboration_memberships) \
        .join(collaboration_membership, CollaborationMembership.collaboration) \
        .join(CollaborationMembership.groups) \
        .join(collaboration_group, Group.collaboration) \
        .filter(or_(collaboration_group.identifier == identifier,
                    collaboration_membership.identifier == identifier)) \
        .all()
    return users, 200


@collaboration_api.route("/lite/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_lite_by_id(collaboration_id):
    confirm_collaboration_member(collaboration_id)

    collaboration = Collaboration.query \
        .options(selectinload(Collaboration.organisation)
                 .selectinload(Organisation.services)
                 .selectinload(Service.service_memberships)
                 .selectinload(ServiceMembership.user)) \
        .options(selectinload(Collaboration.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups)
                 .selectinload(Group.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.services)
                 .selectinload(Service.service_memberships)
                 .selectinload(ServiceMembership.user)) \
        .filter(Collaboration.id == collaboration_id).one()

    if not collaboration.disclose_member_information or not collaboration.disclose_email_information:
        json_collaboration = jsonify(collaboration).json
        _del_non_disclosure_info(collaboration, json_collaboration)
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
    if collaboration_id == "v1":
        raise MethodNotAllowed()

    confirm_collaboration_admin(collaboration_id, read_only=True)

    collaboration = Collaboration.query \
        .options(selectinload(Collaboration.organisation)
                 .selectinload(Organisation.services)
                 .selectinload(Service.service_memberships)
                 .selectinload(ServiceMembership.user)) \
        .options(selectinload(Collaboration.collaboration_memberships).selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.collaboration_memberships)
                 .selectinload(CollaborationMembership.user)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.invitations)) \
        .options(selectinload(Collaboration.groups).selectinload(Group.service_group)
                 .selectinload(ServiceGroup.service)) \
        .options(selectinload(Collaboration.invitations).selectinload(Invitation.user)) \
        .options(selectinload(Collaboration.join_requests).selectinload(JoinRequest.user)) \
        .options(selectinload(Collaboration.services)
                 .selectinload(Service.service_memberships)
                 .selectinload(ServiceMembership.user)) \
        .options(selectinload(Collaboration.tags)) \
        .options(selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.service)) \
        .options(selectinload(Collaboration.service_connection_requests)
                 .selectinload(ServiceConnectionRequest.requester)) \
        .filter(Collaboration.id == collaboration_id).one()

    collaboration_json = jsonify(collaboration).json
    collaboration_json["invitations"] = [invitation for invitation in collaboration_json["invitations"] if
                                         invitation["status"] == "open"]

    return collaboration_json, 200


@collaboration_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def collaboration_invites():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)

    administrators = data.get("administrators", [])
    message = data.get("message", None)
    intended_role = data.get("intended_role", "member")
    intended_role = "member" if intended_role not in ["admin", "member"] else intended_role

    group_ids = data.get("groups", [])

    groups = Group.query \
        .filter(Group.collaboration_id == collaboration_id) \
        .filter(Group.id.in_(group_ids)) \
        .all()

    collaboration = db.session.get(Collaboration, collaboration_id)
    user = db.session.get(User, current_user_id())

    membership_expiry_date = data.get("membership_expiry_date")
    if membership_expiry_date:
        membership_expiry_date = datetime.fromtimestamp(data.get("membership_expiry_date"), tz=timezone.utc)

    duplicate_invitations = [i.invitee_email for i in invitations_by_email(collaboration_id, administrators)]
    if duplicate_invitations:
        raise BadRequest(f"Duplicate email invitations: {duplicate_invitations}")

    for administrator in administrators:
        invitation = Invitation(hash=generate_token(), message=message, invitee_email=administrator,
                                collaboration=collaboration, user=user, status="open",
                                intended_role=intended_role, expiry_date=default_expiry_date(json_dict=data),
                                membership_expiry_date=membership_expiry_date, created_by=user.uid,
                                external_identifier=str(uuid.uuid4()), sender_name=user.name)
        db.session.add(invitation)
        invitation.groups.extend(groups)
        service_names = [service.name for service in invitation.collaboration.services]
        db.session.commit()
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": administrator
        }, collaboration, [administrator], service_names)

    update_last_activity_date(collaboration_id)

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    return None, 201


@collaboration_api.route("/unsuspend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def unsuspend():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)
    collaboration = db.session.get(Collaboration, collaboration_id)
    collaboration.last_activity_date = dt_now()
    collaboration.status = STATUS_ACTIVE
    db.session.merge(collaboration)
    db.session.commit()
    return {}, 201


@collaboration_api.route("/activate", methods=["PUT"], strict_slashes=False)
@json_endpoint
def activate():
    data = current_request.get_json()
    collaboration_id = data["collaboration_id"]
    confirm_collaboration_admin(collaboration_id)
    collaboration = db.session.get(Collaboration, collaboration_id)
    collaboration.last_activity_date = dt_now()
    collaboration.expiry_date = None
    collaboration.status = STATUS_ACTIVE
    db.session.merge(collaboration)
    db.session.commit()
    return {}, 201


@collaboration_api.route("/invites-preview", methods=["POST"], strict_slashes=False)
@json_endpoint
def collaboration_invites_preview():
    data = current_request.get_json()
    message = data.get("message", None)
    intended_role = data.get("intended_role", "member")

    collaboration = db.session.get(Collaboration, int(data["collaboration_id"]))
    confirm_collaboration_admin(collaboration.id)

    user = db.session.get(User, current_user_id())
    invitation = munchify({
        "user": user,
        "collaboration": collaboration,
        "intended_role": intended_role,
        "message": message,
        "hash": generate_token(),
        "expiry_date": default_expiry_date(data)
    })
    service_names = [service.name for service in invitation.collaboration.services]
    html = mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link,

    }, collaboration, [], service_names, preview=True)
    return {"html": html}, 201


@collaboration_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration():
    data = current_request.get_json()
    if "organisation_id" in data:
        confirm_organisation_admin_or_manager(data["organisation_id"])
        organisation = db.session.get(Organisation, data["organisation_id"])
        user = db.session.get(User, current_user_id())
    else:
        raise BadRequest("No organisation_id in POST data")
    current_user_admin = data.get("current_user_admin", False)
    if "current_user_admin" in data:
        del data["current_user_admin"]

    return do_save_collaboration(data, organisation, user, current_user_admin)


@collaboration_api.route("/v1", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/post_new_collaboration.yml")
@json_endpoint
def save_collaboration_api():
    data = current_request.get_json()
    confirm_external_api_call()
    required = ["name", "description", "disable_join_requests", "disclose_member_information",
                "disclose_email_information", "administrators"]
    if "accepted_user_policy" in data:
        del data["accepted_user_policy"]

    organisation = request_context.external_api_organisation
    admins = list(filter(lambda mem: mem.role == "admin", organisation.organisation_memberships))
    user = admins[0].user if len(admins) > 0 else User.query.filter(
        User.uid == current_app.app_config.admin_users[0].uid).one()
    data["organisation_id"] = organisation.id
    logo = data.get("logo")
    if logo:
        try:
            groups = re.search(r"data:image/.*;base64,((.|\n)*)", logo)
            if groups:
                logo = groups[1]
            decoded_bytes = base64.decodebytes(logo.encode())
            data["logo"] = transform_image(decoded_bytes)
        except Exception as e:
            raise APIBadRequest(f"Invalid Logo: {str(e)}")
    else:
        with db.engine.connect() as conn:
            data["logo"] = next(conn.execute(text(f"SELECT logo FROM organisations where id = {organisation.id}")))[0]

    missing = [req for req in required if req not in data]
    if missing:
        raise APIBadRequest(f"Missing required attributes: {missing}")
    if "short_name" in data:
        if not cleanse_short_name(data):
            raise APIBadRequest(f"Invalid CO short_name: {data['short_name']}")
    else:
        data["short_name"] = generate_short_name(Collaboration, data["name"])
    # The do_save_collaboration strips out all non-collaboration keys
    tags = data.get("tags", None)
    administrator = data.get("administrator")
    # Ensure to skip current_user is CO admin check
    request_context.skip_collaboration_admin_confirmation = True
    # units - if present - need to be transformed to dict objects
    api_key = request_context.get("external_api_key")
    if api_key.units:
        data["units"] = [
            {"id": unit.id,
             "organisation_id": organisation.id,
             "name": unit.name} for unit in api_key.units]
    elif "units" in data:
        data["units"] = [
            {"id": _unit_from_name(unit, organisation.id).id,
             "organisation_id": organisation.id,
             "name": unit} for unit in data["units"]]

    res = do_save_collaboration(data, organisation, user, current_user_admin=False, save_tags=False)
    collaboration = res[0]

    if administrator:
        admin_user = User.query.filter(User.uid == administrator).first()
        if admin_user:
            admin_collaboration_membership = CollaborationMembership(role="admin", user_id=admin_user.id,
                                                                     collaboration_id=collaboration.id,
                                                                     created_by=user.uid, updated_by=user.uid)
            db.session.merge(admin_collaboration_membership)
            db.session.commit()
    # Prevent ValueError: Circular reference detected cause of tags
    collaboration_json = jsonify(collaboration).json
    collaboration_json["units"] = [unit.name for unit in collaboration.units]

    if tags:
        tags = _reconcile_tags(collaboration, tags, is_external_api=True)
        collaboration_json["tags"] = tags
    return collaboration_json, 201


@collaboration_api.route("/hint_short_name", methods=["POST"], strict_slashes=False)
@json_endpoint
def hint_short_name():
    data = current_request.get_json()
    short_name_hint = generate_short_name(Collaboration, data["name"])
    return {"short_name": short_name_hint}, 200


def do_save_collaboration(data, organisation, user, current_user_admin=True, save_tags=True):
    _validate_collaboration(data, organisation)

    administrators = data.get("administrators", [])
    invalid_emails = [email for email in administrators if not bool(email_re.match(email))]
    if invalid_emails:
        raise BadRequest(f"Invalid emails {invalid_emails}")
    message = data.get("message", None)
    tags = data.get("tags", None)

    valid_uri_attributes(data, ["accepted_user_policy", "website_url"])

    data["identifier"] = str(uuid.uuid4())
    res = save(Collaboration, custom_json=data, allow_child_cascades=False, allowed_child_collections=["units"])
    collaboration = res[0]

    if tags and save_tags:
        _reconcile_tags(collaboration, tags)

    administrators = list(filter(lambda admin: admin != user.email, administrators))
    service_names = [service.name for service in collaboration.services]
    for administrator in administrators:
        invitation = Invitation(hash=generate_token(), message=message, invitee_email=administrator,
                                collaboration_id=collaboration.id, user=user, intended_role="admin",
                                external_identifier=str(uuid.uuid4()), sender_name=user.name,
                                expiry_date=default_expiry_date(), status="open", created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": administrator
        }, collaboration, [administrator], service_names)

    if current_user_admin:
        admin_collaboration_membership = CollaborationMembership(role="admin", user_id=user.id,
                                                                 collaboration_id=collaboration.id,
                                                                 created_by=user.uid, updated_by=user.uid)
        collaboration_id = collaboration.id
        db.session.merge(admin_collaboration_membership)
        db.session.commit()

        broadcast_collaboration_changed(collaboration_id)

    services = organisation.services
    for service in services:
        create_service_groups(service, res[0])

    emit_socket(f"organisation_{collaboration.organisation_id}")

    return res


def _validate_collaboration(data, organisation, new_collaboration=True):
    cleanse_short_name(data)
    expiry_date = data.get("expiry_date")
    if expiry_date:
        past_dates_allowed = current_app.app_config.feature.past_dates_allowed
        dt = datetime.fromtimestamp(int(expiry_date), timezone.utc) + timedelta(hours=4)
        if not past_dates_allowed and dt < dt_now():
            raise APIBadRequest(f"It is not allowed to set the expiry date ({dt}) in the past")
        data["expiry_date"] = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        data["expiry_date"] = None
    # Check if the status needs updating
    if new_collaboration or "status" not in data:
        data["status"] = STATUS_ACTIVE
    else:
        collaboration = db.session.get(Collaboration, data["id"])
        if collaboration.status == STATUS_EXPIRED and (not expiry_date or data["expiry_date"] > dt_now()):
            data["status"] = STATUS_ACTIVE
        if collaboration.status == STATUS_SUSPENDED:
            data["status"] = STATUS_ACTIVE

    if _do_name_exists(data["name"], organisation.id,
                       existing_collaboration="" if new_collaboration else data["name"]):
        raise APIBadRequest(f"Collaboration with name '{data['name']}' already exists within "
                            f"organisation '{organisation.name}'.")
    if _do_short_name_exists(data["short_name"], organisation.id,
                             existing_collaboration="" if new_collaboration else data["short_name"]):
        raise APIBadRequest(f"Collaboration with short_name '{data['short_name']}' already exists within "
                            f"organisation '{organisation.name}'.")

    validate_units(data, organisation)

    _assign_global_urn(data["organisation_id"], data)
    data["last_activity_date"] = dt_now()


def _assign_global_urn(organisation_id, data):
    organisation = db.session.get(Organisation, organisation_id)
    assign_global_urn_to_collaboration(organisation, data)


def assign_global_urn_to_collaboration(organisation, data):
    data["global_urn"] = f"{organisation.short_name}:{data['short_name']}"


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    data = current_request.get_json()
    confirm_collaboration_admin(data["id"])

    organisation = db.session.get(Organisation, int(data["organisation_id"]))
    collaboration = db.session.get(Collaboration, data["id"])

    if not has_org_manager_unit_access(current_user_id(), collaboration) and "units" in data:
        del data["units"]

    _validate_collaboration(data, organisation, new_collaboration=False)

    if collaboration.organisation_id != organisation.id:
        confirm_write_access()

    current_user_id()
    user = db.session.get(User, current_user_id())
    is_admin = is_admin_user(user)

    short_name_changed = collaboration.short_name != data["short_name"]
    if is_admin and (short_name_changed or collaboration.organisation_id != organisation.id):
        for group in collaboration.groups:
            group.global_urn = f"{organisation.short_name}:{data['short_name']}:{group.short_name}"
            db.session.merge(group)

    if not is_admin and short_name_changed:
        data["short_name"] = collaboration.short_name

    if "tags" in data:
        _reconcile_tags(collaboration, data.get("tags", []))

    # For updating references like services, groups, memberships there are more fine-grained API methods
    res = update(Collaboration, custom_json=data, allow_child_cascades=False, allowed_child_collections=["units"])

    emit_socket(f"collaboration_{collaboration.id}")
    broadcast_collaboration_changed(collaboration.id)

    return res


@collaboration_api.route("/<collaboration_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(collaboration_id):
    confirm_collaboration_admin(collaboration_id)
    tag_identifiers = _tag_identifiers(collaboration_id)

    collaboration = Collaboration.query.filter(Collaboration.id == int(collaboration_id)).one()
    emit_socket(f"organisation_{collaboration.organisation_id}")
    broadcast_collaboration_deleted(collaboration_id)

    res = delete(Collaboration, collaboration_id)

    _delete_orphan_tags(tag_identifiers)

    return res


@collaboration_api.route("/v1/<co_identifier>/units", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/update_collaboration_units.yml")
@json_endpoint
def api_update_collaboration_units(co_identifier):
    collaboration = confirm_organisation_api_collaboration(co_identifier)

    api_key = request_context.get("external_api_key")
    if api_key.units:
        raise Forbidden("API key is scoped with units. Update collaboration units not allowed")
    units = current_request.get_json()
    new_units = [_unit_from_name(unit, collaboration.organisation_id) for unit in units]
    collaboration.units = new_units

    db.session.merge(collaboration)
    db.session.commit()

    emit_socket(f"collaboration_{collaboration.id}")

    return collaboration, 201
