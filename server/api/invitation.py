import datetime
import re
import uuid
from operator import xor

from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app, g as request_context, jsonify
from sqlalchemy import or_, func
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.orm import load_only
from werkzeug.exceptions import Conflict, Forbidden, BadRequest

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.service_aups import add_user_aups
from server.auth.secrets import generate_token
from server.auth.security import confirm_collaboration_admin, current_user_id, confirm_external_api_call, \
    confirm_api_key_unit_access
from server.db.activity import update_last_activity_date
from server.db.defaults import default_expiry_date, STATUS_OPEN, STATUS_EXPIRED
from server.db.domain import Invitation, CollaborationMembership, Collaboration, db, User, JoinRequest, Group, \
    OrganisationAup
from server.db.models import delete
from server.mail import mail_collaboration_invitation
from server.scim.events import broadcast_collaboration_changed
from server.tools import dt_now

CREATED_BY_SYSTEM = "system"

invitations_api = Blueprint("invitations_api", __name__, url_prefix="/api/invitations")

email_re = re.compile("^\\S+@\\S+$")


def _invitation_query():
    return Invitation.query \
        .options(joinedload(Invitation.collaboration, innerjoin=True)
                 .selectinload(Collaboration.collaboration_memberships)
                 .joinedload(CollaborationMembership.user, innerjoin=True)) \
        .options(joinedload(Invitation.collaboration, innerjoin=True)
                 .joinedload(Collaboration.organisation, innerjoin=True)) \
        .options(joinedload(Invitation.user, innerjoin=True)) \
        .options(selectinload(Invitation.groups))


def do_resend(invitation_id):
    invitation = _invitation_query() \
        .filter(Invitation.id == invitation_id) \
        .one()
    confirm_collaboration_admin(invitation.collaboration_id)
    invitation.expiry_date = default_expiry_date() if invitation.is_expired() else invitation.expiry_date
    invitation.created_at = dt_now() if invitation.is_expired() else invitation.created_at
    service_names = [service.name for service in invitation.collaboration.services]
    db.session.merge(invitation)
    mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link,
        "recipient": invitation.invitee_email
    }, invitation.collaboration, [invitation.invitee_email], service_names)


def parse_date(val, default_date=None):
    return datetime.datetime.fromtimestamp(val / 1e3, tz=datetime.timezone.utc) if val and (
            isinstance(val, float) or isinstance(val, int)) else default_date


def group_to_dict(group: Group):
    return {
        "id": group.id,
        "short_name": group.short_name,
        "global_urn": group.global_urn,
        "identifier": group.identifier,
        "name": group.name,
        "description": group.description
    }


def invitation_to_dict(invitation, include_expiry_date=False):
    collaboration = invitation.collaboration
    res = {
        "status": invitation.status,
        "invitation": {
            "identifier": invitation.external_identifier,
            "email": invitation.invitee_email,
            "expiry_date": invitation.expiry_date
        },
        "collaboration": {
            "id": collaboration.id,
            "identifier": collaboration.identifier,
            "name": collaboration.name,
            "short_name": collaboration.short_name,
            "description": collaboration.description,
            "global_urn": collaboration.global_urn
        },
        "intended_role": invitation.intended_role,
        "groups": [group_to_dict(group) for group in invitation.groups]
    }
    if include_expiry_date:
        res["invitation"]["expiry_date"] = invitation.expiry_date
    return res


def add_organisation_aups(collaboration: Collaboration, user: User):
    organisation = collaboration.organisation
    org_identifiers = [aup.organisation_id for aup in user.organisation_aups]
    if organisation.accepted_user_policy and organisation.id not in org_identifiers:
        organisation_aup = OrganisationAup(aup_url=organisation.accepted_user_policy, user=user,
                                           organisation=organisation)
        db.session.add(organisation_aup)


@invitations_api.route("/find_by_hash", methods=["GET"], strict_slashes=False)
@json_endpoint
def invitations_by_hash():
    hash_value = query_param("hash")
    invitation_query = _invitation_query()
    invitation = invitation_query \
        .filter(Invitation.hash == hash_value) \
        .one()
    # To avoid conflict: Loader strategies for ORM Path[Mapper
    # [Invitation(invitations)] -> Invitation.groups -> Mapper[Group(groups)]] conflict
    invitation.groups
    invitation.collaboration.groups
    invitation.collaboration.services
    invitation.collaboration.organisation

    for member in invitation.collaboration.collaboration_memberships:
        member.user

    invitation_json = jsonify(invitation).json
    # Sanitize user information
    for cm in invitation_json["collaboration"]["collaboration_memberships"]:
        cm["user"] = User.sanitize_user(cm["user"])
    invitation_json["user"] = User.sanitize_user(invitation_json["user"])

    if not query_param("expand", required=False):
        return invitation_json, 200

    service_emails = invitation.collaboration.service_emails()
    admin_emails = invitation.collaboration.organisation.admin_emails()
    return {"invitation": invitation_json, "service_emails": service_emails, "admin_emails": admin_emails}, 200


@invitations_api.route("/exists_email", methods=["POST"], strict_slashes=False)
@json_endpoint
def invitation_exists_by_email():
    data = current_request.get_json()
    collaboration_id = int(data["collaboration_id"])
    invitations = invitations_by_email(collaboration_id, data["emails"])
    return [i.invitee_email for i in invitations], 200


def invitations_by_email(collaboration_id, emails):
    invitations = Invitation.query.options(load_only(Invitation.invitee_email)) \
        .filter(func.lower(Invitation.invitee_email).in_([e.lower() for e in emails])) \
        .filter(Invitation.collaboration_id == collaboration_id) \
        .filter(Invitation.status == STATUS_OPEN) \
        .all()
    return invitations


@invitations_api.route("/v1/collaboration_invites", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/put_new_invitations.yml")
@json_endpoint
def collaboration_invites_api():
    confirm_external_api_call()
    organisation = request_context.external_api_organisation

    data = current_request.get_json()
    coll_short_name = data.get("short_name")
    coll_identifier = data.get("collaboration_identifier")
    if not xor(bool(coll_short_name), bool(coll_identifier)):
        raise BadRequest("Exactly one of short_name and collaboration_identifier is required")

    collaborations = list(filter(lambda coll: coll.short_name == coll_short_name or coll.identifier == coll_identifier,
                                 organisation.collaborations))
    if not collaborations:
        raise Forbidden(f"Collaboration {coll_short_name or coll_identifier} is not part of "
                        f"organisation {organisation.name}")

    collaboration = collaborations[0]

    api_key = request_context.get("external_api_key")
    confirm_api_key_unit_access(api_key, collaboration)

    collaboration_admins = list(filter(lambda cm: cm.role == "admin", collaboration.collaboration_memberships))

    if len(collaboration_admins) > 0:
        user = collaboration_admins[0].user
    elif len(organisation.organisation_memberships) > 0:
        user = organisation.organisation_memberships[0].user
    else:
        user = User.query.filter(User.uid == current_app.app_config.admin_users[0].uid).one()

    update_last_activity_date(collaboration.id)

    message = data.get("message")
    intended_role = data.get("intended_role", "member")
    intended_role = "member" if intended_role not in ["admin", "member"] else intended_role

    expiry_date = parse_date(data.get("invitation_expiry_date"), default_expiry_date())
    membership_expiry_date = parse_date(data.get("membership_expiry_date"))
    invites = list(filter(lambda recipient: bool(email_re.match(recipient)), data["invites"]))

    duplicate_invitations = [i.invitee_email for i in invitations_by_email(collaboration.id, invites)]
    if duplicate_invitations:
        raise BadRequest(f"Duplicate email invitations: {duplicate_invitations}")

    invites_results = []

    group_ids = data.get("groups", [])
    groups = []
    for group_identifier in group_ids:
        group = Group.query \
            .filter(Group.collaboration_id == collaboration.id) \
            .filter(or_(Group.short_name == group_identifier, Group.identifier == group_identifier)) \
            .first()
        if not group:
            raise BadRequest(f"Invalid group identifier: {group_identifier}")
        groups.append(group)
    service_names = [service.name for service in collaboration.services]
    sender_name = data.get("sender_name", organisation.name)
    for email in invites:
        invitation = Invitation(hash=generate_token(), message=message, invitee_email=email, sender_name=sender_name,
                                collaboration_id=collaboration.id, user=user, intended_role=intended_role,
                                expiry_date=expiry_date, membership_expiry_date=membership_expiry_date,
                                created_by=CREATED_BY_SYSTEM, external_identifier=str(uuid.uuid4()), status="open")
        invitation.groups.extend(groups)
        db.session.add(invitation)
        invites_results.append({
            "email": email,
            "invitation_expiry_date": expiry_date,
            "status": "open",
            "invitation_id": invitation.external_identifier

        })
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": email
        }, collaboration, [email], service_names)

    emit_socket(f"collaboration_{collaboration.id}")

    return invites_results, 201


@invitations_api.route("/accept", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_accept():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    if invitation.status != "open":
        raise Conflict(f"The invitation has status {invitation.status}")

    if invitation.expiry_date and invitation.expiry_date < dt_now():
        if invitation.created_by == CREATED_BY_SYSTEM:
            invitation.status = STATUS_EXPIRED
            db.session.merge(invitation)
            db.session.commit()
        else:
            delete(Invitation, invitation.id)
        raise Conflict(f"The invitation has expired at {invitation.expiry_date}")

    collaboration = invitation.collaboration
    user_id = current_user_id()
    if collaboration.is_member(user_id):
        delete(Invitation, invitation.id)
        raise Conflict(f"User {user_id} is already a member of {collaboration.name}")

    role = invitation.intended_role if invitation.intended_role else "member"
    collaboration_membership = CollaborationMembership(user_id=user_id,
                                                       collaboration_id=collaboration.id,
                                                       role=role,
                                                       expiry_date=invitation.membership_expiry_date,
                                                       created_by=invitation.user.uid,
                                                       updated_by=invitation.user.uid)
    if invitation.created_by == CREATED_BY_SYSTEM:
        collaboration_membership.invitation_id = invitation.id
    try:
        collaboration_membership = db.session.merge(collaboration_membership)

        # ensure all authorisation group membership are added
        groups = invitation.groups + list(filter(lambda ag: ag.auto_provision_members, collaboration.groups))

        unique_groups = list(set({ag.id: ag for ag in groups}.values()))
        for group in unique_groups:
            if collaboration_membership not in group.collaboration_memberships:
                group.collaboration_memberships.append(collaboration_membership)
                db.session.merge(group)

        db.session.commit()
    except DatabaseError as e:
        # This can happen as multiple threads try to accept the outstanding invitation
        return {"error": str(e)}, 400

    user = add_user_aups(collaboration, user_id)
    add_organisation_aups(collaboration, user)

    # Any outstanding join request for this user and this collaboration can be deleted now
    JoinRequest.query.filter(JoinRequest.user_id == user_id, JoinRequest.collaboration_id == collaboration.id).delete()

    res = {'collaboration_id': collaboration.id, 'user_id': user_id}

    # Need to reload to prevent sqlalchemy.orm.exc.DetachedInstanceError
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()
    collaboration_id = invitation.collaboration.id
    # We need the persistent identifier of the collaboration_membership which will be generated after the delete-commit
    if invitation.created_by == CREATED_BY_SYSTEM:
        invitation.status = "accepted"
        db.session.merge(invitation)
    else:
        delete(Invitation, invitation.id)

    emit_socket(f"collaboration_{collaboration_id}", include_current_user_id=True)
    broadcast_collaboration_changed(collaboration_id)

    return res, 201


@invitations_api.route("/decline", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_decline():
    invitation = _invitation_query() \
        .filter(Invitation.hash == current_request.get_json()["hash"]) \
        .one()

    collaboration = invitation.collaboration

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    db.session.delete(invitation)
    return None, 201


@invitations_api.route("/resend", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend():
    data = current_request.get_json()
    do_resend(data["id"])
    return None, 201


@invitations_api.route("/resend_bulk", methods=["PUT"], strict_slashes=False)
@json_endpoint
def invitations_resend_bulk():
    data = current_request.get_json()
    for invitation in data:
        do_resend(invitation["id"])
    return None, 201


@invitations_api.route("/<invitation_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_invitation(invitation_id):
    invitation = Invitation.query.filter(Invitation.id == invitation_id).one()
    collaboration = invitation.collaboration
    confirm_collaboration_admin(collaboration.id)

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    return delete(Invitation, invitation_id)


@invitations_api.route("/delete_by_hash/<hash>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_by_hash(hash):
    invitation = Invitation.query.filter(Invitation.hash == hash).one()
    collaboration = invitation.collaboration

    emit_socket(f"collaboration_{collaboration.id}", include_current_user_id=True)

    db.session.delete(invitation)
    return {}, 204


@invitations_api.route("/v1/<external_identifier>", strict_slashes=False)
@swag_from("../swagger/public/paths/get_invitation_by_identifier.yml")
@json_endpoint
def external_invitation(external_identifier):
    invitation = Invitation.query.filter(Invitation.external_identifier == external_identifier).one()

    api_key = request_context.get("external_api_key")
    confirm_api_key_unit_access(api_key, invitation.collaboration)

    res = invitation_to_dict(invitation)
    if invitation.status == "accepted":
        cm = CollaborationMembership.query.filter(CollaborationMembership.invitation_id == invitation.id).one()
        res["user"] = {
            "name": cm.user.name,
            "mail": cm.user.email,
            "username": cm.user.username,
            "platform_id": cm.user.uid,
            "status": "suspended" if cm.user.suspended else "active"
        }
    else:
        res["invitation"]["expiry_date"] = invitation.expiry_date
    return res, 200


@invitations_api.route("/v1/resend/<external_identifier>", methods=["PUT"], strict_slashes=False)
@swag_from("../swagger/public/paths/resend_invitation_by_identifier.yml")
@json_endpoint
def resend_external_invitation(external_identifier):
    invitation = Invitation.query.filter(Invitation.external_identifier == external_identifier).one()

    api_key = request_context.get("external_api_key")
    confirm_api_key_unit_access(api_key, invitation.collaboration)

    if invitation.is_expired():
        invitation.expiry_date = default_expiry_date()
        invitation.created_at = dt_now()
        db.session.merge(invitation)

    service_names = [service.name for service in invitation.collaboration.services]
    mail_collaboration_invitation({
        "salutation": "Dear",
        "invitation": invitation,
        "base_url": current_app.app_config.base_url,
        "wiki_link": current_app.app_config.wiki_link,
        "recipient": invitation.invitee_email
    }, invitation.collaboration, [invitation.invitee_email], service_names, reminder=True, preview=False,
        working_outside_of_request_context=True)
    return invitation_to_dict(invitation, include_expiry_date=True), 201


@invitations_api.route("/v1/<external_identifier>", methods=["DELETE"], strict_slashes=False)
@swag_from("../swagger/public/paths/delete_invitation_by_identifier.yml")
@json_endpoint
def delete_external_invitation(external_identifier):
    invitation = Invitation.query.filter(Invitation.external_identifier == external_identifier).one()

    api_key = request_context.get("external_api_key")
    confirm_api_key_unit_access(api_key, invitation.collaboration)

    db.session.delete(invitation)
    return None, 204


@invitations_api.route("/v1/invitations/<co_identifier>", strict_slashes=False)
@swag_from("../swagger/public/paths/get_open_invitations.yml")
@json_endpoint
def get_open_invitations(co_identifier):
    api_key = request_context.get("external_api_key")
    collaboration = Collaboration.query.filter(Collaboration.identifier == co_identifier).one()
    confirm_api_key_unit_access(api_key, collaboration)

    invitations = Invitation.query \
        .filter(Invitation.collaboration == collaboration) \
        .filter(Invitation.status == STATUS_OPEN) \
        .all()
    return [invitation_to_dict(invitation, True) for invitation in invitations], 200
