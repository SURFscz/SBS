import urllib.parse
import uuid

from flask import Blueprint, request as current_request, g as request_context, jsonify, current_app
from sqlalchemy import text, func
from sqlalchemy.orm import load_only, selectinload
from werkzeug.exceptions import Forbidden, BadRequest

from server.api.base import json_endpoint, query_param, emit_socket
from server.api.ipaddress import validate_ip_networks
from server.api.service_invitation import service_invitations_by_email
from server.auth.secrets import generate_token, generate_password_with_hash
from server.auth.security import confirm_write_access, current_user_id, confirm_read_access, is_collaboration_admin, \
    is_organisation_admin_or_manager, is_application_admin, confirm_service_admin, \
    confirm_external_api_call, is_service_admin_or_manager
from server.auth.tokens import encrypt_scim_bearer_token, decrypt_scim_bearer_token
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, cleanse_short_name, default_expiry_date, valid_uri_attributes, \
    service_token_options, generate_short_name
from server.db.domain import Service, Collaboration, CollaborationMembership, Organisation, OrganisationMembership, \
    User, ServiceInvitation, ServiceMembership, ServiceToken
from server.db.logo_mixin import logo_url
from server.db.models import update, save, delete, unique_model_objects
from server.mail import mail_platform_admins, mail_service_invitation, mail_delete_service_request
from server.manage.api import sync_external_service, delete_external_service

URI_ATTRIBUTES = ["uri", "uri_info", "privacy_policy", "accepted_user_policy", "scim_url"]

DISALLOW = "DISALLOW"
ON_REQUEST = "ON_REQUEST"
ALWAYS = "ALWAYS"

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")

base_service_query = """
    SELECT s.id, s.name, s.uuid4 ,
    (SELECT COUNT(scr.id) FROM service_connection_requests scr WHERE scr.service_id = s.id
    AND scr.status = 'open' AND scr.pending_organisation_approval = 0) AS req_count,
    (SELECT COUNT(sc.id) FROM services_collaborations sc WHERE sc.service_id = s.id) AS c_count
    FROM services s
"""


def _result_set_to_services(result_set):
    return [{"id": row[0], "name": row[1], "logo": f"{logo_url('services', row[2])}",
             "connection_requests_count": row[3],
             "collaborations_count": row[4]} for row in result_set]


def _is_org_member():
    user_id = current_user_id()
    return OrganisationMembership.query \
        .options(load_only(OrganisationMembership.id)) \
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


# Services connected to an organisation where the user is a member of
def services_from_organisation_memberships(user_id, service_id=None, count_only=False):
    query = Service.query \
        .join(Service.organisations) \
        .join(Organisation.organisation_memberships) \
        .join(OrganisationMembership.user) \
        .filter(User.id == user_id)

    return _services_from_query(count_only, query, service_id)


def member_access_to_service(service_id):
    user_id = current_user_id()
    count = services_from_collaboration_memberships(user_id, service_id, True)
    if count > 0:
        return True
    count = services_from_organisation_memberships(user_id, service_id, True)
    if count > 0:
        return True
    service = Service.query.filter(Service.id == service_id).one()
    return service.non_member_users_access_allowed


def user_service(service_id, view_only=True):
    # Every service may be seen by organisation admin, service admin, service manager or coll admin
    if is_service_admin_or_manager(service_id) or is_application_admin():
        return True

    if view_only and (is_collaboration_admin() or is_organisation_admin_or_manager()):
        return True

    return member_access_to_service(service_id)


def _do_get_services(restrict_for_current_user=False, include_counts=False):
    def override_func():
        return is_collaboration_admin() or _is_org_member() or is_service_admin_or_manager()

    confirm_read_access(override_func=override_func)
    query = Service.query \
        .options(selectinload(Service.allowed_organisations)) \
        .options(selectinload(Service.automatic_connection_allowed_organisations)) \
        .options(selectinload(Service.service_connection_requests))

    if restrict_for_current_user:
        query = query.join(Service.service_memberships) \
            .filter(ServiceMembership.user_id == current_user_id())

    services = query.all()
    if not include_counts or len(services) == 0:
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
    if restrict_for_current_user and len(services) > 0:
        query += f" where s.id in ({','.join([str(s.id) for s in services])})"

    with db.engine.connect() as conn:
        result_set = conn.execute(text(query))
    services_json = jsonify(services).json
    services_json_dict = {s["id"]: s for s in services_json}
    for row in result_set:
        service_json = services_json_dict.get(row[0])
        service_json["organisations_count"] = row[1]
        service_json["collaborations_count"] = row[2]
    return services_json, 200


def _token_validity_days(data):
    days = data.get("token_validity_days")
    if isinstance(days, str):
        data["token_validity_days"] = int(days) if len(days.strip()) > 0 else None


def _do_toggle_permission_organisation(service_id, organisation_id, action):
    confirm_service_admin(service_id)
    organisation = db.session.get(Organisation, organisation_id)
    service = db.session.get(Service, service_id)

    if action == ALWAYS:
        if organisation in service.allowed_organisations:
            service.allowed_organisations.remove(organisation)
        if organisation not in service.automatic_connection_allowed_organisations:
            service.automatic_connection_allowed_organisations.append(organisation)
    elif action == ON_REQUEST:
        if organisation in service.automatic_connection_allowed_organisations:
            service.automatic_connection_allowed_organisations.remove(organisation)
        if organisation not in service.allowed_organisations:
            service.allowed_organisations.append(organisation)
    elif action == DISALLOW:
        if organisation in service.allowed_organisations:
            service.allowed_organisations.remove(organisation)
        if organisation in service.automatic_connection_allowed_organisations:
            service.automatic_connection_allowed_organisations.remove(organisation)
        if organisation in service.organisations:
            organisation.services.remove(service)
        for collaboration in [coll for coll in service.collaborations if coll.organisation == organisation]:
            service.collaborations.remove(collaboration)

    db.session.merge(service)

    emit_socket(f"service_{service_id}")
    emit_socket(f"organisation_{organisation_id}")

    return None, 201


@service_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    name = query_param("name")
    existing_service = query_param("existing_service", required=False, default="")
    service = Service.query.options(load_only(Service.id)) \
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
    service = Service.query.options(load_only(Service.id)) \
        .filter(func.lower(Service.entity_id) == func.lower(entity_id)) \
        .filter(func.lower(Service.entity_id) != func.lower(existing_service)) \
        .first()
    return service is not None, 200


@service_api.route("/abbreviation_exists", strict_slashes=False)
@json_endpoint
def abbreviation_exists():
    abbreviation = query_param("abbreviation")
    existing_service = query_param("existing_service", required=False, default="")
    service = Service.query.options(load_only(Service.id)) \
        .filter(func.lower(Service.abbreviation) == func.lower(abbreviation)) \
        .filter(func.lower(Service.abbreviation) != func.lower(existing_service)) \
        .first()
    return service is not None, 200


@service_api.route("/ldap_identifier", strict_slashes=False)
@json_endpoint
def ldap_identifier():
    return {"ldap_identifier": uuid.uuid4()}, 200


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
    user = db.session.get(User, current_user_id())
    service = Service.query.filter(Service.uuid4 == uuid4).one()

    if not is_application_admin() and not user_service(service.id):
        raise Forbidden()

    service_emails = {}
    if service.contact_email:
        service_emails[service.id] = [service.contact_email]
    else:
        service_emails[service.id] = [m.user.email for m in service.service_memberships if m.role == "admin"]

    collaborations = []
    for cm in user.collaboration_memberships:
        if service.id in [s.id for s in cm.collaboration.services]:
            collaborations.append(cm.collaboration)

    return {"service": service, "collaborations": collaborations, "service_emails": service_emails}, 200


@service_api.route("/member_access_to_service/<service_id>", strict_slashes=False)
@json_endpoint
def has_member_access_to_service(service_id):
    has_access = member_access_to_service(int(service_id))
    return has_access, 200


@service_api.route("/<service_id>", strict_slashes=False)
@json_endpoint
def service_by_id(service_id):
    confirm_read_access(service_id, override_func=user_service)

    query = Service.query \
        .options(selectinload(Service.service_memberships).selectinload(ServiceMembership.user))

    api_call = request_context.is_authorized_api_call
    add_admin_info = not api_call and (is_application_admin() or is_service_admin_or_manager(service_id))
    if add_admin_info:
        query = query \
            .options(selectinload(Service.collaborations).selectinload(Collaboration.organisation)) \
            .options(selectinload(Service.service_memberships).selectinload(ServiceMembership.user)) \
            .options(selectinload(Service.service_invitations).selectinload(ServiceInvitation.user)) \
            .options(selectinload(Service.allowed_organisations)) \
            .options(selectinload(Service.automatic_connection_allowed_organisations)) \
            .options(selectinload(Service.ip_networks)) \
            .options(selectinload(Service.service_tokens)) \
            .options(selectinload(Service.service_groups))
        service = query.filter(Service.id == service_id).one()
    else:
        service = query.filter(Service.id == service_id).one()
    if api_call:
        query = query \
            .options(selectinload(Service.ip_networks))
        service = query.filter(Service.id == service_id).one()
        res = jsonify(service).json
        del res["logo"]
        return res, 200

    res = jsonify(service).json
    res["has_scim_bearer_token"] = service.scim_bearer_token_db_value() is not None
    return res, 200


@service_api.route("/all", strict_slashes=False)
@json_endpoint
def all_services():
    include_counts = query_param("include_counts", required=False)
    return _do_get_services(include_counts=include_counts)


@service_api.route("/all_optimized", strict_slashes=False)
@json_endpoint
def all_optimized_services():
    sql = text(base_service_query)
    with db.engine.connect() as conn:
        result_set = conn.execute(sql)
        return _result_set_to_services(result_set), 200


@service_api.route("/mine_optimized", strict_slashes=False)
@json_endpoint
def mine_optimized_services():
    values = {"user_id": current_user_id()}
    join_sql = " INNER JOIN service_memberships sm_mine ON sm_mine.service_id = s.id WHERE sm_mine.user_id = :user_id"
    clean_sql = text(base_service_query + join_sql)
    with db.engine.connect() as conn:
        result_set = conn.execute(clean_sql, values)
        return _result_set_to_services(result_set), 200


@service_api.route("/mine", strict_slashes=False)
@json_endpoint
def mine_services():
    return _do_get_services(restrict_for_current_user=True, include_counts=True)


@service_api.route("/v1/access/<user_id>", strict_slashes=False)
@json_endpoint
def user_services(user_id):
    def convert_service(service: Service):
        return {
            "name": service.name,
            "description": service.description,
            "entity_id": service.entity_id,
            "logo": service.logo,
            "privacy_policy": service.privacy_policy,
            "uri": service.uri,
            "support_email": service.support_email
        }

    confirm_external_api_call()
    organisation = request_context.external_api_organisation
    count = CollaborationMembership.query \
        .options(load_only(CollaborationMembership.id)) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.organisation) \
        .filter(CollaborationMembership.user_id == user_id) \
        .filter(Collaboration.organisation_id == organisation.id) \
        .count()
    if count == 0:
        raise Forbidden(f"User {user_id} is not a member of a collaboration in the {organisation.name} organisation")

    services = services_from_organisation_memberships(user_id)
    services += services_from_collaboration_memberships(user_id)
    return [convert_service(service) for service in unique_model_objects(services)], 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    confirm_write_access()
    data = current_request.get_json()

    validate_ip_networks(data)
    valid_uri_attributes(data, URI_ATTRIBUTES)
    _token_validity_days(data)

    data["status"] = STATUS_ACTIVE
    cleanse_short_name(data, "abbreviation")
    hashed, _ = generate_password_with_hash()
    data["ldap_password"] = hashed

    # Before the JSON is cleaned in the save method
    administrators = data.get("administrators", [])
    message = data.get("message", None)
    data["connection_setting"] = "NO_ONE_ALLOWED"
    res = save(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]

    sync_external_service(current_app, service)

    user = db.session.get(User, current_user_id())
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
            "intended_role": "admin",
            "recipient": administrator
        }, service, [administrator])

    mail_platform_admins(service)
    service.ip_networks
    return res


@service_api.route("/toggle_access_property/<service_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def toggle_access_property(service_id):
    json_dict = current_request.get_json()
    attribute = list(json_dict.keys())[0]
    if attribute not in ["reset", "non_member_users_access_allowed", "access_allowed_for_all",
                         "automatic_connection_allowed", "connection_setting",
                         "override_access_allowed_all_connections", "access_allowed_for_crm_organisation"]:
        raise BadRequest(f"attribute {attribute} not allowed")
    enabled = json_dict.get(attribute)
    if attribute in ["non_member_users_access_allowed"] and enabled:
        confirm_write_access()
    else:
        confirm_service_admin(service_id)
    with db.session.no_autoflush:
        service = db.session.get(Service, service_id)

        if attribute == "access_allowed_for_crm_organisation" and enabled and not service.crm_organisation:
            raise BadRequest("access_allowed_for_crm_organisation requires crm_organisation")

        if attribute == "reset":
            service.automatic_connection_allowed = False
            service.non_member_users_access_allowed = False
            service.override_access_allowed_all_connections = False
            service.access_allowed_for_all = False
            service.connection_setting = "NO_ONE_ALLOWED"
            service.allowed_organisations.clear()
            service.organisations.clear()
            service.automatic_connection_allowed_organisations.clear()
            service.collaborations.clear()
        else:
            setattr(service, attribute, enabled)

        if attribute == "access_allowed_for_all":
            service.override_access_allowed_all_connections = False
            if enabled:
                # For all organisations that are not connected we need to make a connection (with surf-only check)
                allowed_org_identifiers = [org.id for org in service.allowed_organisations]
                automatic_allowed_org_identifiers = [org.id for org in
                                                     service.automatic_connection_allowed_organisations]
                query = Organisation.query \
                    .filter(Organisation.id.notin_(allowed_org_identifiers + automatic_allowed_org_identifiers))
                if not service.allow_restricted_orgs:
                    query = query.filter(Organisation.services_restricted == False)  # noqa: E712
                not_connected_organisations = query.all()
                if service.automatic_connection_allowed:
                    filtered_organisations = [org for org in not_connected_organisations if
                                              org not in service.automatic_connection_allowed_organisations]
                    service.automatic_connection_allowed_organisations += filtered_organisations
                else:
                    filtered_organisations = [org for org in not_connected_organisations if
                                              org not in service.allowed_organisations]
                    service.allowed_organisations += filtered_organisations
        elif attribute == "override_access_allowed_all_connections":
            service.access_allowed_for_all = False
            if enabled:
                service.automatic_connection_allowed = False
                service.allowed_organisations.clear()
                service.organisations.clear()
                service.automatic_connection_allowed_organisations.clear()
                service.collaborations.clear()
        elif attribute == "automatic_connection_allowed":
            if enabled:
                service.connection_setting = None
                filtered_organisations = [org for org in service.allowed_organisations if
                                          org not in service.automatic_connection_allowed_organisations]
                service.automatic_connection_allowed_organisations += filtered_organisations
                service.allowed_organisations = []
            else:
                connection_setting = query_param("connection_setting", False, "MANUALLY_APPROVE")
                service.connection_setting = connection_setting
                if connection_setting == "MANUALLY_APPROVE":
                    filtered_organisations = [org for org in service.automatic_connection_allowed_organisations if
                                              org not in service.allowed_organisations]
                    service.allowed_organisations += filtered_organisations
                    service.automatic_connection_allowed_organisations = []
        elif attribute == "non_member_users_access_allowed":
            service.connection_setting = None
            service.access_allowed_for_crm_organisation = False
            if not enabled:
                service.override_access_allowed_all_connections = False

        elif attribute == "access_allowed_for_crm_organisation":
            service.connection_setting = None
            service.non_member_users_access_allowed = False
            if not enabled:
                service.override_access_allowed_all_connections = False
        db.session.merge(service)

    emit_socket(f"service_{service_id}")
    emit_socket("service")

    return None, 201


@service_api.route("/invites", methods=["PUT"], strict_slashes=False)
@json_endpoint
def service_invites():
    data = current_request.get_json()
    service_id = data["service_id"]
    confirm_service_admin(service_id)

    administrators = data.get("administrators", [])
    message = data.get("message", None)
    intended_role = data.get("intended_role", "manager")
    if intended_role not in ["admin", "manager"]:
        raise BadRequest("Invalid intended role")

    service = db.session.get(Service, service_id)
    user = db.session.get(User, current_user_id())

    duplicate_invitations = [i.invitee_email for i in service_invitations_by_email(administrators, service_id)]
    if duplicate_invitations:
        raise BadRequest(f"Duplicate email invitations: {duplicate_invitations}")

    for administrator in administrators:
        invitation = ServiceInvitation(hash=generate_token(),
                                       message=message,
                                       invitee_email=administrator,
                                       service=service,
                                       user=user,
                                       intended_role=intended_role,
                                       created_by=user.uid,
                                       expiry_date=default_expiry_date(json_dict=data))
        db.session.add(invitation)
        mail_service_invitation({
            "salutation": "Dear",
            "invitation": invitation,
            "base_url": current_app.app_config.base_url,
            "wiki_link": current_app.app_config.wiki_link,
            "recipient": administrator,
            "intended_role": intended_role
        }, service, [administrator])

    emit_socket(f"service_{service_id}", include_current_user_id=True)

    return None, 201


@service_api.route("/hint_short_name", methods=["POST"], strict_slashes=False)
@json_endpoint
def hint_short_name():
    data = current_request.get_json()
    short_name_hint = generate_short_name(Service, data["name"], "abbreviation")
    return {"short_name": short_name_hint}, 200


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
        forbidden = ["allow_restricted_orgs", "non_member_users_access_allowed", "entity_id", "abbreviation"]
        for attr in [fb for fb in forbidden if fb in data]:
            data[attr] = getattr(service, attr)

    for attr in ["sweep_scim_last_run", "ldap_password", "scim_bearer_token", "oidc_client_secret", "exported_at"]:
        if attr in data:
            del data[attr]

    if not data.get("ldap_enabled"):
        data["ldap_password"] = None

    for enabled, token_type in service_token_options.items():
        if not data.get(enabled):
            ServiceToken.query \
                .filter(ServiceToken.service_id == service_id) \
                .filter(ServiceToken.token_type == token_type) \
                .delete()

    scim_url_changed = data.get("scim_url", None) != service.scim_url and bool(service.scim_bearer_token_db_value())
    # Before we update we need to get the unencrypted bearer_token
    scim_enabled = data.get("scim_enabled", False)
    if scim_url_changed and scim_enabled:
        plain_bearer_token = decrypt_scim_bearer_token(service)

    if not scim_enabled:
        # Clean up the Scim related attributes
        data["scim_url"] = None
        data["scim_bearer_token"] = None
        data["sweep_scim_enabled"] = False
        data["sweep_remove_orphans"] = False
        data["sweep_scim_daily_rate"] = None

    res = update(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]

    sync_external_service(current_app, service)

    if scim_url_changed and scim_enabled:
        service.scim_bearer_token = plain_bearer_token
        encrypt_scim_bearer_token(service)

    service.ip_networks

    emit_socket(f"service_{service_id}")

    return res


@service_api.route("/disallow_organisation/<service_id>/<organisation_id>",
                   methods=["PUT"], strict_slashes=False)
@json_endpoint
def disallow_organisation(service_id, organisation_id):
    return _do_toggle_permission_organisation(service_id, organisation_id, DISALLOW)


@service_api.route("/on_request_organisation/<service_id>/<organisation_id>",
                   methods=["PUT"], strict_slashes=False)
@json_endpoint
def on_request_organisation(service_id, organisation_id):
    return _do_toggle_permission_organisation(service_id, organisation_id, ON_REQUEST)


@service_api.route("/trust_organisation/<service_id>/<organisation_id>",
                   methods=["PUT"], strict_slashes=False)
@json_endpoint
def trust_organisation(service_id, organisation_id):
    return _do_toggle_permission_organisation(service_id, organisation_id, ALWAYS)


@service_api.route("/request_delete/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def request_delete_service(service_id):
    confirm_service_admin(service_id)
    service = db.session.get(Service, service_id)
    mail_delete_service_request(service)
    return {}, 204


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    confirm_write_access()

    service = db.session.get(Service, service_id)
    delete_external_service(current_app, service.export_external_identifier)

    return delete(Service, service_id)


@service_api.route("/reset_ldap_password/<service_id>", strict_slashes=False)
@json_endpoint
def reset_ldap_password(service_id):
    confirm_service_admin(service_id)
    service = db.session.get(Service, service_id)
    hashed, password = generate_password_with_hash()
    service.ldap_password = hashed
    db.session.merge(service)
    return {"ldap_password": password}, 200


@service_api.route("/reset_oidc_client_secret/<service_id>", strict_slashes=False)
@json_endpoint
def reset_oidc_client_secret(service_id):
    confirm_service_admin(service_id)
    service = db.session.get(Service, service_id)
    hashed_oidc_client_secret, oidc_client_secret = generate_password_with_hash(rounds=5)
    service.oidc_client_secret = hashed_oidc_client_secret
    db.session.merge(service)
    return {"oidc_client_secret": oidc_client_secret}, 200


@service_api.route("/reset_scim_bearer_token/<service_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def reset_scim_bearer_token(service_id):
    confirm_service_admin(service_id)
    service = db.session.get(Service, service_id)
    # Ensure we only change the scim_bearer_token and optional the url
    data = current_request.get_json()
    service.scim_bearer_token = data.get("scim_bearer_token")
    service.scim_url = data.get("scim_url", service.scim_url)
    encrypt_scim_bearer_token(service)
    return {}, 201
