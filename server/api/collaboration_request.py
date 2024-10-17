import re
import uuid

from flask import Blueprint, request as current_request, current_app
from munch import munchify
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint, emit_socket
from server.api.collaboration import assign_global_urn_to_collaboration, do_save_collaboration
from server.api.unit import validate_units
from server.auth.security import current_user_id, current_user_name, \
    confirm_organisation_admin_or_manager, confirm_write_access
from server.db.defaults import cleanse_short_name, STATUS_ACTIVE, STATUS_OPEN, STATUS_DENIED, STATUS_APPROVED
from server.db.domain import User, CollaborationRequest, Collaboration, CollaborationMembership, db, \
    SchacHomeOrganisation, OrganisationMembership
from server.db.logo_mixin import logo_from_cache
from server.db.models import save, delete
from server.mail import mail_collaboration_request, mail_accepted_declined_collaboration_request, \
    mail_automatic_collaboration_request
from server.scim.events import broadcast_collaboration_changed

collaboration_request_api = Blueprint("collaboration_request_api", __name__, url_prefix="/api/collaboration_requests")


def membership_allowed(membership: OrganisationMembership, co_units) -> bool:
    if membership.role == "admin" or not membership.units:
        return True
    manager_unit_identifiers = [unit.id for unit in membership.units]
    return bool([identifier for identifier in manager_unit_identifiers if identifier in co_units])


def current_member_unit_allowed(organisation_id, units):
    user_id = current_user_id()
    membership = OrganisationMembership.query \
        .filter(OrganisationMembership.user_id == user_id) \
        .filter(OrganisationMembership.organisation_id == organisation_id) \
        .one()
    return membership_allowed(membership, [unit.id for unit in units])


@collaboration_request_api.route("/<collaboration_request_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def collaboration_request_by_id(collaboration_request_id):
    collaboration_request = CollaborationRequest.query \
        .join(CollaborationRequest.organisation) \
        .join(CollaborationRequest.requester) \
        .options(contains_eager(CollaborationRequest.organisation)) \
        .options(contains_eager(CollaborationRequest.requester)) \
        .filter(CollaborationRequest.id == collaboration_request_id) \
        .one()

    organisation_id = collaboration_request.organisation_id
    confirm_write_access(organisation_id, collaboration_request.units, override_func=current_member_unit_allowed)
    return collaboration_request, 200


@collaboration_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_collaboration():
    data = current_request.get_json()
    user = db.session.get(User, current_user_id())
    organisations = SchacHomeOrganisation.organisations_by_user_schac_home(user)
    if not organisations:
        raise BadRequest(f"There is no organisation with a schac_home_organisation that equals the "
                         f"schac_home_organisation {user.schac_home_organisation} of User {user.email}")
    organisation = organisations[0]
    data["requester_id"] = user.id

    cleanse_short_name(data)

    message = data.get("message")
    auto_create = organisation.collaboration_creation_allowed
    entitlement = current_app.app_config.collaboration_creation_allowed_entitlement
    auto_aff = user.entitlement and entitlement in user.entitlement
    co_units = [int(unit["id"]) for unit in data.get("units", [])]

    allowed_members = [m for m in organisation.organisation_memberships if membership_allowed(m, co_units)]
    recipients = [member.user.email for member in allowed_members]

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    if auto_create or auto_aff:
        collaboration = do_save_collaboration(data, organisation, user, current_user_admin=True)[0]
        context = {"salutation": f"Dear {organisation.name} organisation admin,",
                   "base_url": current_app.app_config.base_url,
                   "collaboration": collaboration,
                   "message": message,
                   "organisation": organisation,
                   "collaboration_creation_allowed_entitlement": entitlement,
                   "user": user}
        if recipients:
            mail_automatic_collaboration_request(context, collaboration, organisation, recipients)
        return collaboration, 201
    else:
        data["status"] = STATUS_OPEN

        validate_units(data, organisation)

        res = save(CollaborationRequest,
                   custom_json=data,
                   allow_child_cascades=False,
                   allowed_child_collections=["units"])
        collaboration_request = res[0]

        context = {"salutation": f"Dear {organisation.name} organisation admin,",
                   "base_url": current_app.app_config.base_url,
                   "collaboration_request": collaboration_request,
                   "user": user}
        if recipients:
            mail_collaboration_request(context, munchify(data), recipients)

        return collaboration_request, 201


@collaboration_request_api.route("/<collaboration_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_request_collaboration(collaboration_request_id):
    collaboration_request = db.session.get(CollaborationRequest, collaboration_request_id)
    organisation_id = collaboration_request.organisation_id
    confirm_write_access(organisation_id, collaboration_request.units, override_func=current_member_unit_allowed)
    if collaboration_request.status == STATUS_OPEN:
        raise BadRequest("Collaboration request with status 'open' can not be deleted")

    organisation = collaboration_request.organisation
    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return delete(CollaborationRequest, collaboration_request_id)


@collaboration_request_api.route("/approve/<collaboration_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_request(collaboration_request_id):
    collaboration_request = db.session.get(CollaborationRequest, collaboration_request_id)
    organisation_id = collaboration_request.organisation_id
    confirm_write_access(organisation_id, collaboration_request.units, override_func=current_member_unit_allowed)

    client_data = current_request.get_json()
    attributes = ["name", "short_name", "description", "organisation_id", "accepted_user_policy", "logo",
                  "website_url", "logo"]

    # take the data from client_data as it can be different
    data = {"identifier": str(uuid.uuid4())}
    for attr in attributes:
        data[attr] = client_data.get(attr, None)
    # only not None attribute
    data["units"] = client_data.get("units", [])
    # bugfix for logo url instead of raw data in the POST from the client - only happens when the logo is unchanged
    logo = data.get("logo")
    if logo and logo.startswith("http"):
        groups = re.search(r".*api/images/(.*)/(.*)", logo).groups()
        data["logo"] = logo_from_cache(groups[0], groups[1])

    assign_global_urn_to_collaboration(collaboration_request.organisation, data)

    data["status"] = STATUS_ACTIVE

    validate_units(data, collaboration_request.organisation)

    res = save(Collaboration, custom_json=data, allow_child_cascades=False, allowed_child_collections=["units"])
    collaboration = res[0]

    user = collaboration_request.requester
    admin_collaboration_membership = CollaborationMembership(role="admin", user_id=user.id,
                                                             collaboration_id=collaboration.id,
                                                             created_by=user.uid, updated_by=user.uid)
    collaboration_id = collaboration.id
    db.session.merge(admin_collaboration_membership)
    db.session.commit()

    broadcast_collaboration_changed(collaboration_id)

    mail_accepted_declined_collaboration_request({"salutation": f"Dear {user.name}",
                                                  "base_url": current_app.app_config.base_url,
                                                  "administrator": current_user_name(),
                                                  "collaboration": collaboration,
                                                  "organisation": collaboration_request.organisation,
                                                  "user": user},
                                                 collaboration.name,
                                                 collaboration_request.organisation,
                                                 True,
                                                 [user.email])
    collaboration_request.status = STATUS_APPROVED
    db.session.merge(collaboration_request)

    emit_socket(f"organisation_{collaboration_id}", include_current_user_id=True)

    return res


@collaboration_request_api.route("/deny/<collaboration_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_request(collaboration_request_id):
    collaboration_request = db.session.get(CollaborationRequest, collaboration_request_id)
    confirm_organisation_admin_or_manager(collaboration_request.organisation_id)

    rejection_reason = current_request.get_json()["rejection_reason"]

    user = collaboration_request.requester
    mail_accepted_declined_collaboration_request({"salutation": f"Dear {user.name}",
                                                  "base_url": current_app.app_config.base_url,
                                                  "administrator": current_user_name(),
                                                  "rejection_reason": rejection_reason,
                                                  "collaboration": {"name": collaboration_request.name},
                                                  "organisation": collaboration_request.organisation,
                                                  "user": user},
                                                 collaboration_request.name,
                                                 collaboration_request.organisation,
                                                 False,
                                                 [user.email])
    collaboration_request.status = STATUS_DENIED
    collaboration_request.rejection_reason = rejection_reason
    db.session.merge(collaboration_request)

    organisation = collaboration_request.organisation

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return None, 201
