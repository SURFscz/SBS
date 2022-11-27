import urllib.parse

from flask import Blueprint, request as current_request, g as request_context, jsonify, current_app
from sqlalchemy import text, func
from sqlalchemy.orm import load_only, selectinload
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.ipaddress import validate_ip_networks
from server.auth.secrets import generate_token, generate_ldap_password_with_hash
from server.auth.security import confirm_write_access, current_user_id, confirm_read_access, is_collaboration_admin, \
    is_organisation_admin_or_manager, is_application_admin, is_service_admin, confirm_service_admin
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, cleanse_short_name, default_expiry_date, valid_uri_attributes
from server.db.domain import Service, Collaboration, CollaborationMembership, Organisation, OrganisationMembership, \
    User, ServiceInvitation, ServiceMembership, ServiceToken
from server.db.models import update, save, delete
from server.mail import mail_platform_admins, mail_service_invitation

URI_ATTRIBUTES = ["uri", "uri_info", "privacy_policy", "accepted_user_policy"]

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")


def _is_org_member():
    user_id = current_user_id()
    return OrganisationMembership.query \
               .options(load_only("id")) \
               .filter(OrganisationMembership.user_id == user_id) \
               .count() > 0


def _services_from_query(count_only, query, service_id):
    if service_id:
        query = query.filter(Service.id == service_id)
    return query.count() if count_only else query.all()


# Services connected to a collaboration where the user is a member of
def services_from_collaboration_memberships(user_id, service_id=None, count_only=False):
    query = Service.query \
        .join(Service.collaborations) \
        .join(Collaboration.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .filter(User.id == user_id)

    return _services_from_query(count_only, query, service_id)


# Services connected to a organisation which has a collaboration where the user is a member of
def services_from_organisation_collaboration_memberships(user_id, service_id=None, count_only=False):
    query = Service.query \
        .join(Service.organisations) \
        .join(Organisation.collaborations) \
        .join(Collaboration.collaboration_memberships) \
        .join(CollaborationMembership.user) \
        .filter(User.id == user_id)

    return _services_from_query(count_only, query, service_id)


# Services connected to a organisation where the user is a member of
def services_from_organisation_memberships(user_id, service_id=None, count_only=False):
    query = Service.query \
        .join(Service.organisations) \
        .join(Organisation.organisation_memberships) \
        .join(OrganisationMembership.user) \
        .filter(User.id == user_id)

    return _services_from_query(count_only, query, service_id)


def user_service(service_id, view_only=True):
    # Every service may be seen by organisation admin, service admin, manager or coll admin
    if is_service_admin(service_id) or is_application_admin():
        return True

    if view_only and (is_collaboration_admin() or is_organisation_admin_or_manager()):
        return True

    user_id = current_user_id()
    count = services_from_collaboration_memberships(user_id, service_id, True)
    if count > 0:
        return True

    count = services_from_organisation_collaboration_memberships(user_id, service_id, True)
    if count > 0:
        return True

    count = services_from_organisation_memberships(user_id, service_id, True)
    if count > 0:
        return True

    service = Service.query.filter(Service.id == service_id).one()
    return service.non_member_users_access_allowed


def _do_get_services(restrict_for_current_user=False, include_counts=False):
    def override_func():
        return is_collaboration_admin() or _is_org_member() or is_service_admin()

    confirm_read_access(override_func=override_func)
    query = Service.query \
        .options(selectinload(Service.allowed_organisations)) \
        .options(selectinload(Service.service_connection_requests)) \
        .options(selectinload(Service.ip_networks))

    if restrict_for_current_user:
        query = query.join(Service.service_memberships) \
            .filter(ServiceMembership.user_id == current_user_id())

    services = query.all()
    if not include_counts:
        return services, 200

    query = """
        select s.id as id,
            (select count(so.id) from services_organisations so where so.service_id = s.id) as so_count ,
            ((select count(sc.id) from services_collaborations sc where sc.service_id = s.id) +
            (select count(c.id) from collaborations c where c.organisation_id in (
                    select so.organisation_id from services_organisations so where so.service_id = s.id
                ) and c.id not in (
                    select sc.collaboration_id from services_collaborations sc where sc.service_id = s.id
            ))) as c_count from services s
    """
    if restrict_for_current_user:
        query += f" where s.id in ({','.join([str(s.id) for s in services])})"

    result_set = db.engine.execute(text(query))
    services_json = jsonify(services).json
    services_json_dict = {s["id"]: s for s in services_json}
    for row in result_set:
        service_json = services_json_dict.get(row[0])
        service_json["organisations_count"] = row[1]
        service_json["collaborations_count"] = row[2]
    return services_json, 200


@service_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    confirm_service_admin()

    name = query_param("name")
    existing_service = query_param("existing_service", required=False, default="")
    service = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.name) == func.lower(name)) \
        .filter(func.lower(Service.name) != func.lower(existing_service)) \
        .first()

    return service is not None, 200


@service_api.route("/entity_id_exists", strict_slashes=False)
@json_endpoint
def entity_id_exists():
    confirm_service_admin()

    entity_id = query_param("entity_id")
    existing_service = query_param("existing_service", required=False, default="")
    service = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.entity_id) == func.lower(entity_id)) \
        .filter(func.lower(Service.entity_id) != func.lower(existing_service)) \
        .first()
    return service is not None, 200


@service_api.route("/abbreviation_exists", strict_slashes=False)
@json_endpoint
def abbreviation_exists():
    confirm_service_admin()

    abbreviation = query_param("abbreviation")
    existing_service = query_param("existing_service", required=False, default="")
    service = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.abbreviation) == func.lower(abbreviation)) \
        .filter(func.lower(Service.abbreviation) != func.lower(existing_service)) \
        .first()
    return service is not None, 200


@service_api.route("/find_by_entity_id", strict_slashes=False)
@json_endpoint
def service_by_entity_id():
    entity_id = urllib.parse.unquote(query_param("entity_id"))
    return Service.query \
               .options(selectinload(Service.allowed_organisations)) \
               .filter(Service.entity_id == entity_id) \
               .one(), 200


@service_api.route("/find_by_uuid4", strict_slashes=False)
@json_endpoint
def service_by_uuid4():
    uuid4 = urllib.parse.unquote(query_param("uuid4"))
    user = User.query.get(current_user_id())
    service = Service.query.filter(Service.uuid4 == uuid4).one()

    if not is_application_admin() and not user_service(service.id):
        raise Forbidden()

    service_emails = {}
    if service.contact_email:
        service_emails[service.id] = [service.contact_email]
    else:
        service_emails[service.id] = [membership.user.email for membership in service.service_memberships]

    collaborations = []
    for cm in user.collaboration_memberships:
        if service.id in [s.id for s in cm.collaboration.services]:
            collaborations.append(cm.collaboration)

    return {"service": service, "collaborations": collaborations, "service_emails": service_emails}, 200


@service_api.route("/<service_id>", strict_slashes=False)
@json_endpoint
def service_by_id(service_id):
    confirm_read_access(service_id, override_func=user_service)

    query = Service.query \
        .options(selectinload(Service.service_memberships).selectinload(ServiceMembership.user))

    api_call = request_context.is_authorized_api_call
    add_admin_info = not api_call and (is_application_admin() or is_service_admin(service_id))
    if add_admin_info:
        query = query \
            .options(selectinload(Service.collaborations).selectinload(Collaboration.organisation)) \
            .options(selectinload(Service.service_memberships).selectinload(ServiceMembership.user)) \
            .options(selectinload(Service.organisations)) \
            .options(selectinload(Service.service_invitations)) \
            .options(selectinload(Service.allowed_organisations)) \
            .options(selectinload(Service.automatic_connection_allowed_organisations)) \
            .options(selectinload(Service.ip_networks)) \
            .options(selectinload(Service.service_tokens)) \
            .options(selectinload(Service.service_groups))
        service = query.filter(Service.id == service_id).one()
        res = jsonify(service).json
        res["service_organisation_collaborations"] = []
        # To prevent circular references value error
        if len(res["organisations"]) > 0:
            collaborations = Collaboration.query \
                .options(selectinload(Collaboration.organisation)) \
                .join(Collaboration.organisation) \
                .join(Organisation.services) \
                .filter(Service.id == service_id) \
                .all()
            res["service_organisation_collaborations"] = jsonify(collaborations).json
        return res, 200
    if api_call:
        query = query \
            .options(selectinload(Service.ip_networks))
        service = query.filter(Service.id == service_id).one()
        res = jsonify(service).json
        del res["logo"]
        return res, 200

    return query.filter(Service.id == service_id).one(), 200


@service_api.route("/all", strict_slashes=False)
@json_endpoint
def all_services():
    include_counts = query_param("include_counts", required=False)
    return _do_get_services(include_counts=include_counts)


@service_api.route("/mine", strict_slashes=False)
@json_endpoint
def mine_services():
    return _do_get_services(restrict_for_current_user=True, include_counts=True)


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    data = current_request.get_json()

    validate_ip_networks(data)
    valid_uri_attributes(data, URI_ATTRIBUTES)
    _token_validity_days(data)

    data["status"] = STATUS_ACTIVE
    cleanse_short_name(data, "abbreviation")
    hashed, _ = generate_ldap_password_with_hash()
    data["ldap_password"] = hashed

    # Before the JSON is cleaned in the save method
    administrators = data.get("administrators", [])
    message = data.get("message", None)

    res = save(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]

    user = User.query.get(current_user_id())
    for administrator in administrators:
        invitation = ServiceInvitation(hash=generate_token(), message=message, invitee_email=administrator,
                                       service_id=service.id, user=user, intended_role="admin",
                                       expiry_date=default_expiry_date(),
                                       created_by=user.uid)
        invitation = db.session.merge(invitation)
        mail_service_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": administrator
        }, service, [administrator])

    mail_platform_admins(service)
    service.ip_networks
    return res


@service_api.route("/toggle_access_allowed_for_all/<service_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def toggle_access_allowed_for_all(service_id):
    def override_func():
        return is_service_admin(service_id)

    confirm_write_access(override_func=override_func)
    service = Service.query.get(service_id)
    data = current_request.get_json()
    allowed_for_all = data.get("allowed_for_all")
    service.access_allowed_for_all = allowed_for_all
    db.session.merge(service)

    emit_socket(f"service_{service_id}")

    return None, 201


@service_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def service_invites():
    data = current_request.get_json()
    service_id = data["service_id"]
    confirm_service_admin(service_id)

    administrators = data.get("administrators", [])
    message = data.get("message", None)
    intended_role = "admin"

    service = Service.query.get(service_id)
    user = User.query.get(current_user_id())

    for administrator in administrators:
        invitation = ServiceInvitation(hash=generate_token(), message=message, invitee_email=administrator,
                                       service=service, user=user, created_by=user.uid,
                                       intended_role=intended_role, expiry_date=default_expiry_date(json_dict=data))
        invitation = db.session.merge(invitation)
        mail_service_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": administrator
        }, service, [administrator])

    emit_socket(f"service_{service_id}", include_current_user_id=True)

    return None, 201


def _token_validity_days(data):
    days = data.get("token_validity_days")
    if isinstance(days, str):
        data["token_validity_days"] = int(days) if len(days.strip()) > 0 else None


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    data = current_request.get_json()

    service_id = data["id"]
    confirm_service_admin(service_id)

    validate_ip_networks(data)
    valid_uri_attributes(data, URI_ATTRIBUTES)
    _token_validity_days(data)
    cleanse_short_name(data, "abbreviation")
    service = Service.query.filter(Service.id == service_id).one()

    if not is_application_admin():
        forbidden = ["white_listed", "non_member_users_access_allowed", "token_enabled", "entity_id", "abbreviation",
                     "pam_web_sso_enabled", "scim_enabled", "scim_url", "scim_bearer_token",
                     "scim_provision_users", "scim_provision_groups"]
        for attr in [fb for fb in forbidden if fb in data]:
            data[attr] = getattr(service, attr)

    if "ldap_password" in data:
        del data["ldap_password"]

    if is_application_admin():
        token_enabled = data["token_enabled"]
        pam_web_sso_enabled = data["pam_web_sso_enabled"]
        if not token_enabled and not pam_web_sso_enabled:
            for service_token in ServiceToken.query.filter(ServiceToken.service_id == service_id).all():
                db.session.delete(service_token)
    else:
        data["token_enabled"] = service.token_enabled
        data["pam_web_sso_enabled"] = service.pam_web_sso_enabled

    automatic_connection_allowed = data.get("automatic_connection_allowed", False)
    if automatic_connection_allowed:
        service.automatic_connection_allowed_organisations.clear()
    else:
        # We need to reconcile the automatic_connection_allowed_organisations, which ones were added and / or removed
        organisations = [Organisation.query.get(org["value"]) for org in
                         data.get("automatic_connection_allowed_organisations", [])]
        existing_organisations = service.automatic_connection_allowed_organisations
        for org in [org for org in organisations if org not in existing_organisations]:
            service.automatic_connection_allowed_organisations.append(org)
        for org in [org for org in existing_organisations if org not in organisations]:
            service.automatic_connection_allowed_organisations.remove(org)

    res = update(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]
    service.ip_networks

    emit_socket(f"service_{service_id}")

    return res


@service_api.route("/allowed_organisations/<service_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_allowed_organisations(service_id):
    def override_func():
        return is_service_admin(service_id)

    confirm_write_access(override_func=override_func)

    service = Service.query.get(service_id)
    data = current_request.get_json()
    allowed_organisations = data.get("allowed_organisations", None)

    org_sql = f"DELETE FROM services_organisations WHERE service_id = {service.id}"
    coll_sql = f"DELETE sc FROM services_collaborations sc INNER JOIN collaborations c on c.id = sc.collaboration_id " \
               f"WHERE sc.service_id = {service.id}"

    need_to_delete = not bool(allowed_organisations)
    if allowed_organisations:
        # find delta, e.g. which one to remove and which ones to add
        current_allowed = [org.id for org in service.allowed_organisations]
        new_allowed = [int(value["organisation_id"]) for value in allowed_organisations]

        to_remove = [org_id for org_id in current_allowed if org_id not in new_allowed]
        to_append = [org_id for org_id in new_allowed if org_id not in current_allowed]
        for org_id in to_remove:
            organisation = Organisation.query.get(org_id)
            service.allowed_organisations.remove(organisation)
            if organisation in service.automatic_connection_allowed_organisations:
                service.automatic_connection_allowed_organisations.remove(organisation)
        for org_id in to_append:
            service.allowed_organisations.append(Organisation.query.get(org_id))

        if to_remove:
            need_to_delete = True
            org_del_ids = ",".join([str(org_id) for org_id in to_remove])
            org_sql += f" AND organisation_id in ({org_del_ids})"
            coll_sql += f" AND c.organisation_id in ({org_del_ids})"

    else:
        service.allowed_organisations.clear()
        service.automatic_connection_allowed_organisations.clear()

    db.session.merge(service)

    if need_to_delete:
        db.engine.execute(text(org_sql))
        db.engine.execute(text(coll_sql))

    emit_socket(f"service_{service_id}")

    return None, 201


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    confirm_write_access()
    return delete(Service, service_id)


@service_api.route("/reset_ldap_password/<service_id>", strict_slashes=False)
@json_endpoint
def reset_ldap_password(service_id):
    confirm_service_admin(service_id)
    service = Service.query.get(service_id)
    hashed, password = generate_ldap_password_with_hash()
    service.ldap_password = hashed
    db.session.merge(service)
    return {"ldap_password": password}, 200
