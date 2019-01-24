import uuid
from secrets import token_urlsafe

from flask import Blueprint, request as current_request, session, current_app
from sqlalchemy import text, or_, func
from sqlalchemy.orm import aliased, load_only, contains_eager
from sqlalchemy.orm import joinedload

from server.api.base import json_endpoint
from server.api.security import confirm_collaboration_admin, confirm_organization_admin, confirm_write_access
from server.db.db import Collaboration, CollaborationMembership, JoinRequest, db, AuthorisationGroup, User, Invitation
from server.db.defaults import default_expiry_date, full_text_search_autocomplete_limit
from server.db.models import update, save, delete
from server.mail import mail_collaboration_invitation

collaboration_api = Blueprint("collaboration_api", __name__, url_prefix="/api/collaborations")


@collaboration_api.route("/find_by_name", strict_slashes=False)
@json_endpoint
def collaboration_by_name():
    name = current_request.args.get("name")
    collaboration = Collaboration.query.filter(Collaboration.name == name).one()
    return collaboration, 200


@collaboration_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = current_request.args.get("name")
    existing_collaboration = current_request.args.get("existing_collaboration", "")
    coll = Collaboration.query.options(load_only("id")) \
        .filter(func.lower(Collaboration.name) == func.lower(name)) \
        .filter(func.lower(Collaboration.name) != func.lower(existing_collaboration)) \
        .first()
    return coll is not None, 200


@collaboration_api.route("/search", strict_slashes=False)
@json_endpoint
def collaboration_search():
    q = current_request.args.get("q")
    base_query = "SELECT id, name, description FROM collaborations "
    if q != "*":
        base_query += f"WHERE MATCH (name, description) AGAINST ('{q}*' IN BOOLEAN MODE) " \
            f"AND id > 0 LIMIT {full_text_search_autocomplete_limit}"
    sql = text(base_query)
    result_set = db.engine.execute(sql)
    res = [{"id": row[0], "name": row[1], "description": row[2]} for row in result_set]
    return res, 200


@collaboration_api.route("services/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_services_by_id(collaboration_id):
    confirm_collaboration_admin(collaboration_id)

    query = Collaboration.query \
        .outerjoin(Collaboration.services) \
        .options(contains_eager(Collaboration.services))
    collaboration = query.filter(Collaboration.id == collaboration_id).one()

    return collaboration, 200


# Call for LSC to get all members based on the identifier of the Collaboration
@collaboration_api.route("/members", strict_slashes=False)
@json_endpoint
def members():
    identifier = current_request.args.get("identifier")
    collaboration_authorisation_group = aliased(Collaboration)
    collaboration_membership = aliased(Collaboration)

    users = User.query \
        .options(load_only("uid", "name")) \
        .join(User.collaboration_memberships) \
        .join(collaboration_membership, CollaborationMembership.collaboration) \
        .join(CollaborationMembership.authorisation_groups) \
        .join(collaboration_authorisation_group, AuthorisationGroup.collaboration) \
        .filter(or_(collaboration_authorisation_group.identifier == identifier,
                    collaboration_membership.identifier == identifier)) \
        .all()
    return users, 200


@collaboration_api.route("/<collaboration_id>", strict_slashes=False)
@json_endpoint
def collaboration_by_id(collaboration_id):
    query = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.authorisation_groups) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(Collaboration.services) \
        .options(contains_eager(Collaboration.authorisation_groups)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.services))

    if not session["user"]["admin"]:
        user_id = session["user"]["id"]
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
    user_id = session["user"]["id"]
    res = Collaboration.query \
        .join(Collaboration.organisation) \
        .outerjoin(Collaboration.authorisation_groups) \
        .outerjoin(Collaboration.invitations) \
        .outerjoin(Collaboration.join_requests) \
        .outerjoin(JoinRequest.user) \
        .outerjoin(Collaboration.services) \
        .options(joinedload(Collaboration.collaboration_memberships)) \
        .options(contains_eager(Collaboration.organisation)) \
        .options(contains_eager(Collaboration.authorisation_groups)) \
        .options(contains_eager(Collaboration.invitations)) \
        .options(contains_eager(Collaboration.join_requests)
                 .contains_eager(JoinRequest.user)) \
        .options(contains_eager(Collaboration.services)) \
        .join(Collaboration.collaboration_memberships) \
        .filter(CollaborationMembership.user_id == user_id) \
        .all()
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

    collaboration = Collaboration.query.get(collaboration_id)
    user = User.query.get(session["user"]["id"])

    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration=collaboration, user=user, intended_role=intended_role,
                                expiry_date=default_expiry_date(json_dict=data),
                                created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, collaboration, [administrator])
    db.session.commit()

    return None, 201


@collaboration_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_collaboration():
    data = current_request.get_json()

    confirm_organization_admin(data["organisation_id"])

    administrators = data["administrators"] if "administrators" in data else []
    message = data["message"] if "message" in data else None
    data["identifier"] = str(uuid.uuid4())

    res = save(Collaboration, custom_json=data)

    user = User.query.get(session["user"]["id"])
    administrators = list(filter(lambda admin: admin != user.email, administrators))
    collaboration = res[0]
    for administrator in administrators:
        invitation = Invitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
                                collaboration=collaboration, user=user, intended_role="admin",
                                expiry_date=default_expiry_date(),
                                created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_collaboration_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url
        }, collaboration, [administrator])

    admin_collaboration_membership = CollaborationMembership(role="admin", user=user, collaboration=collaboration,
                                                             created_by=user.uid)
    db.session.merge(admin_collaboration_membership)
    db.session.commit()

    return res


@collaboration_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_collaboration():
    data = current_request.get_json()
    confirm_collaboration_admin(data["id"])

    # For updating references like services, authorisation_groups, memberships there are more fine-grained API methods
    return update(Collaboration, allow_child_cascades=False)


@collaboration_api.route("/<id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_collaboration(id):
    confirm_collaboration_admin(id)
    return delete(Collaboration, id)
