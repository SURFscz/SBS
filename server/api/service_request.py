import re
import uuid

from flask import Blueprint, request as current_request, current_app
from munch import munchify
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint, STATUS_OPEN, STATUS_APPROVED, STATUS_DENIED, emit_socket
from server.api.service import URI_ATTRIBUTES
from server.auth.security import current_user_id, current_user_name, \
    confirm_organisation_admin_or_manager, confirm_write_access
from server.db.defaults import cleanse_short_name, STATUS_ACTIVE, valid_uri_attributes
from server.db.domain import User, Service, ServiceMembership, db, \
    ServiceRequest
from server.db.logo_mixin import logo_from_cache
from server.db.models import save, delete
from server.mail import mail_accepted_declined_service_request, \
    mail_service_request

service_request_api = Blueprint("service_request_api", __name__, url_prefix="/api/service_requests")


@service_request_api.route("/<service_request_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_request_id_by_id(service_request_id):
    res = ServiceRequest.query \
        .join(ServiceRequest.requester) \
        .options(contains_eager(ServiceRequest.requester)) \
        .filter(ServiceRequest.id == service_request_id) \
        .one()
    confirm_write_access()
    return res, 200


@service_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_service():
    data = current_request.get_json()
    user = db.session.get(User, current_user_id())
    data["requester_id"] = user.id

    data = current_request.get_json()

    valid_uri_attributes(data, URI_ATTRIBUTES)

    data["status"] = STATUS_ACTIVE
    cleanse_short_name(data, "abbreviation")

    res = save(ServiceRequest, custom_json=data, allow_child_cascades=False)
    service_request = res[0]

    emit_socket("service_request")
    context = {"salutation": f"Dear platform admin,",
               "base_url": current_app.app_config.base_url,
               "service_request": service_request,
               "user": user}

    mail_service_request(munchify(data), context)
    return res


@service_request_api.route("/<service_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_request_service(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_organisation_admin_or_manager(service_request.organisation_id)
    if service_request.status == STATUS_OPEN:
        raise BadRequest("Service request with status 'open' can not be deleted")

    organisation = service_request.organisation
    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return delete(ServiceRequest, service_request_id)


@service_request_api.route("/approve/<service_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_request(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_organisation_admin_or_manager(service_request.organisation_id)
    client_data = current_request.get_json()
    attributes = ["name", "short_name", "description", "organisation_id", "accepted_user_policy", "logo",
                  "website_url", "logo"]

    # take the data from client_data as it can be different
    data = {"identifier": str(uuid.uuid4())}
    for attr in attributes:
        data[attr] = client_data.get(attr, None)
    # bugfix for logo url instead of raw data in the POST from the client - only happens when the logo is unchanged
    logo = data.get("logo")
    if logo and logo.startswith("http"):
        groups = re.search(r".*api/images/(.*)/(.*)", logo).groups()
        data["logo"] = logo_from_cache(groups[0], groups[1])

    assign_global_urn_to_service(service_request.organisation, data)

    data["status"] = STATUS_ACTIVE
    res = save(Service, custom_json=data)
    service = res[0]

    user = service_request.requester
    admin_service_membership = ServiceMembership(role="admin", user_id=user.id,
                                                 service_id=service.id,
                                                 created_by=user.uid, updated_by=user.uid)
    service_id = service.id
    db.session.merge(admin_service_membership)
    db.session.commit()

    broadcast_service_changed(service_id)

    mail_accepted_declined_service_request({"salutation": f"Dear {user.name}",
                                            "base_url": current_app.app_config.base_url,
                                            "administrator": current_user_name(),
                                            "service": service,
                                            "organisation": service_request.organisation,
                                            "user": user},
                                           service.name,
                                           service_request.organisation,
                                           True,
                                           [user.email])
    service_request.status = STATUS_APPROVED
    db.session.merge(service_request)

    emit_socket(f"organisation_{service_id}", include_current_user_id=True)

    return res


@service_request_api.route("/deny/<service_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_request(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_organisation_admin_or_manager(service_request.organisation_id)

    rejection_reason = current_request.get_json()["rejection_reason"]

    user = service_request.requester
    mail_accepted_declined_service_request({"salutation": f"Dear {user.name}",
                                            "base_url": current_app.app_config.base_url,
                                            "administrator": current_user_name(),
                                            "rejection_reason": rejection_reason,
                                            "service": {"name": service_request.name},
                                            "organisation": service_request.organisation,
                                            "user": user},
                                           service_request.name,
                                           service_request.organisation,
                                           False,
                                           [user.email])
    service_request.status = STATUS_DENIED
    service_request.rejection_reason = rejection_reason
    db.session.merge(service_request)

    organisation = service_request.organisation

    emit_socket(f"organisation_{organisation.id}", include_current_user_id=True)

    return None, 201
