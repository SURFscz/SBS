import re
import uuid

from flask import Blueprint, request as current_request, current_app, session
from munch import munchify
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import BadRequest, Forbidden

from server.api.base import json_endpoint, emit_socket
from server.api.service import URI_ATTRIBUTES
from server.auth.secrets import generate_password_with_hash, generate_random_password
from server.auth.security import current_user_id, current_user_name, \
    confirm_write_access
from server.db.defaults import cleanse_short_name, valid_uri_attributes, STATUS_OPEN, STATUS_DENIED, STATUS_APPROVED
from server.db.domain import User, Service, ServiceMembership, db, \
    ServiceRequest
from server.db.logo_mixin import logo_from_cache
from server.db.models import save, delete
from server.mail import mail_accepted_declined_service_request, \
    mail_service_request
from server.manage.api import sync_external_service
from server.saml.sp_metadata_parser import parse_metadata_xml, parse_metadata_url

service_request_api = Blueprint("service_request_api", __name__, url_prefix="/api/service_requests")

valid_connection_types = ["openIDConnect", "saml2URL", "saml2File", "none"]


@service_request_api.route("/all", methods=["GET"], strict_slashes=False)
@json_endpoint
def service_request_all():
    confirm_write_access()
    res = ServiceRequest.query \
        .join(ServiceRequest.requester) \
        .options(contains_eager(ServiceRequest.requester)) \
        .all()
    return res, 200


@service_request_api.route("/generate_oidc_client_secret", strict_slashes=False)
@json_endpoint
def generate_oidc_client_secret():
    # The secret is checked with every login, and therefore we use only 5 rounds combined with a strong password
    oidc_client_secret = generate_random_password()
    session["oidc_client_secret"] = oidc_client_secret
    return {"value": oidc_client_secret}, 200


@service_request_api.route("/metadata/parse", methods=["POST"], strict_slashes=False)
@json_endpoint
def metadata_parse():
    data = current_request.get_json()
    meta_data_url = data.get("meta_data_url")
    meta_data_xml = data.get("meta_data_xml")
    if not meta_data_url and not meta_data_xml:
        raise BadRequest("Either meta_data_url or meta_data_xml is required")

    result = parse_metadata_xml(meta_data_xml) if meta_data_xml else parse_metadata_url(meta_data_url)

    return result, 200


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

    data["status"] = STATUS_OPEN
    cleanse_short_name(data, "abbreviation")

    # Validate connection_type
    connection_type = data.get("connection_type")
    if connection_type not in valid_connection_types:
        raise BadRequest(f"{connection_type} not valid. Valid connection_type: {valid_connection_types}")

    oidc_client_secret_posted = data.get("oidc_client_secret")
    manage_enabled = current_app.app_config.manage.enabled
    if manage_enabled and (oidc_client_secret_posted or connection_type == "openIDConnect"):
        oidc_client_secret = session.get("oidc_client_secret")
        if oidc_client_secret != oidc_client_secret_posted:
            raise Forbidden("Tampering with oidc_client_secret token is not allowed")
        data["oidc_client_secret"] = generate_password_with_hash(password=oidc_client_secret, rounds=5)[0]

    res = save(ServiceRequest, custom_json=data, allow_child_cascades=False)
    service_request = res[0]

    emit_socket("service_requests", include_current_user_id=True)

    context = {"salutation": "Dear platform admin",
               "base_url": current_app.app_config.base_url,
               "service_request": service_request,
               "requester_email": user.email,
               "user": user}

    mail_service_request(munchify(data), context)
    return res


@service_request_api.route("/<service_request_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_request_service(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_write_access()
    if service_request.status == STATUS_OPEN:
        raise BadRequest("Service request with status 'open' can not be deleted")

    emit_socket("service_requests", include_current_user_id=True)

    return delete(ServiceRequest, service_request_id)


@service_request_api.route("/approve/<service_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_request(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_write_access()
    client_data = current_request.get_json()
    client_data["identifier"] = str(uuid.uuid4())

    cleanse_short_name(client_data, "abbreviation")
    client_data["ldap_enabled"] = False
    client_data["ldap_identifier"] = uuid.uuid4()

    # bugfix for logo url instead of raw data in the POST from the client - only happens when the logo is unchanged
    logo = client_data.get("logo")
    if logo and logo.startswith("http"):
        groups = re.search(r".*api/images/(.*)/(.*)", logo).groups()
        client_data["logo"] = logo_from_cache(groups[0], groups[1])

    client_data["connection_setting"] = "NO_ONE_ALLOWED"
    if "id" in client_data:
        del client_data["id"]

    # Need to bypass the SecretMixin
    oidc_client_secret = service_request.oidc_client_secret_db_value()

    # If a ServiceRequest is approved then we want sensible values for the *_enabled fields
    if oidc_client_secret and client_data.get("redirect_urls") and client_data.get("grants"):
        client_data["oidc_enabled"] = True
        client_data["oidc_client_secret"] = oidc_client_secret
    if client_data.get("acs_locations"):
        client_data["saml_enabled"] = True

    res = save(Service, custom_json=client_data)
    service = res[0]

    sync_external_service(current_app, service)

    user = service_request.requester
    admin_service_membership = ServiceMembership(role="admin", user_id=user.id,
                                                 service_id=service.id,
                                                 created_by=user.uid, updated_by=user.uid)
    db.session.merge(admin_service_membership)
    db.session.commit()

    context = {"salutation": f"Dear {user.name}",
               "base_url": current_app.app_config.base_url,
               "administrator": current_user_name(),
               "service": service,
               "user": user}
    mail_accepted_declined_service_request(context,
                                           service.name,
                                           True,
                                           [user.email])
    service_request.status = STATUS_APPROVED
    db.session.merge(service_request)

    emit_socket("service_requests", include_current_user_id=True)

    return res


@service_request_api.route("/deny/<service_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_request(service_request_id):
    service_request = db.session.get(ServiceRequest, service_request_id)
    confirm_write_access()

    rejection_reason = current_request.get_json()["rejection_reason"]

    user = service_request.requester
    context = {"salutation": f"Dear {user.name}",
               "base_url": current_app.app_config.base_url,
               "administrator": current_user_name(),
               "rejection_reason": rejection_reason,
               "service": {"name": service_request.name},
               "user": user}
    mail_accepted_declined_service_request(context,
                                           service_request.name,
                                           False,
                                           [user.email])
    service_request.status = STATUS_DENIED
    service_request.rejection_reason = rejection_reason
    db.session.merge(service_request)

    emit_socket("service_requests", include_current_user_id=True)

    return None, 201
