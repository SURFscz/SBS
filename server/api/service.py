# -*- coding: future_fstrings -*-
import ipaddress
import string
import urllib.parse
from secrets import token_urlsafe
import random
from flask import Blueprint, request as current_request, g as request_context, jsonify, current_app
from sqlalchemy import text, func
from sqlalchemy.orm import load_only, selectinload
from passlib.hash import sha512_crypt
from server.api.base import json_endpoint, query_param
from server.auth.security import confirm_write_access, current_user_id, confirm_read_access, is_collaboration_admin, \
    is_organisation_admin_or_manager, is_application_admin, is_service_admin, confirm_service_admin
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, cleanse_short_name, default_expiry_date
from server.db.domain import Service, Collaboration, CollaborationMembership, Organisation, OrganisationMembership, \
    User, ServiceInvitation, ServiceMembership
from server.db.models import update, save, delete
from server.mail import mail_platform_admins, mail_service_invitation

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


def _generate_password():
    return "".join(random.sample(string.ascii_lowercase + string.digits + "_,./~=+@*-", k=32))


def _hash_password(password):
    sha512_crypt.using(rounds=100_000).hash(password);


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


@service_api.route("/name_exists", strict_slashes=False)
@json_endpoint
def name_exists():
    confirm_write_access()

    name = query_param("name")
    existing_service = query_param("existing_service", required=False, default="")
    org = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.name) == func.lower(name)) \
        .filter(func.lower(Service.name) != func.lower(existing_service)) \
        .first()
    return org is not None, 200


@service_api.route("/entity_id_exists", strict_slashes=False)
@json_endpoint
def entity_id_exists():
    confirm_write_access()

    entity_id = query_param("entity_id")
    existing_service = query_param("existing_service", required=False, default="")
    org = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.entity_id) == func.lower(entity_id)) \
        .filter(func.lower(Service.entity_id) != func.lower(existing_service)) \
        .first()
    return org is not None, 200


@service_api.route("/abbreviation_exists", strict_slashes=False)
@json_endpoint
def abbreviation_exists():
    confirm_write_access()

    abbreviation = query_param("abbreviation")
    existing_service = query_param("existing_service", required=False, default="")
    org = Service.query.options(load_only("id")) \
        .filter(func.lower(Service.abbreviation) == func.lower(abbreviation)) \
        .filter(func.lower(Service.abbreviation) != func.lower(existing_service)) \
        .first()
    return org is not None, 200


@service_api.route("/find_by_entity_id", strict_slashes=False)
@json_endpoint
def service_by_entity_id():
    entity_id = urllib.parse.unquote(query_param("entity_id"))
    return Service.query \
               .options(selectinload(Service.allowed_organisations)) \
               .filter(Service.entity_id == entity_id) \
               .one(), 200


@service_api.route("/<service_id>", strict_slashes=False)
@json_endpoint
def service_by_id(service_id):
    def _user_service():
        # Every service may be seen by organisation admin, service admin, manager or coll admin
        if is_service_admin(service_id):
            return True

        if is_collaboration_admin() or is_organisation_admin_or_manager():
            return True

        user_id = current_user_id()
        count = services_from_collaboration_memberships(user_id, service_id, True)
        if count > 0:
            return True

        count = services_from_organisation_collaboration_memberships(user_id, service_id, True)
        if count > 0:
            return True

        count = services_from_organisation_memberships(user_id, service_id, True)
        return count > 0

    confirm_read_access(override_func=_user_service)

    query = Service.query

    api_call = request_context.is_authorized_api_call
    add_admin_info = not api_call and (is_application_admin() or is_service_admin(service_id))
    if add_admin_info:
        query = query \
            .options(selectinload(Service.collaborations).selectinload(Collaboration.organisation)) \
            .options(selectinload(Service.service_memberships).selectinload(ServiceMembership.user)) \
            .options(selectinload(Service.organisations)) \
            .options(selectinload(Service.service_invitations)) \
            .options(selectinload(Service.allowed_organisations)) \
            .options(selectinload(Service.ip_networks)) \
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
    def override_func():
        return is_collaboration_admin() or _is_org_member()

    confirm_write_access(override_func=override_func)

    services = Service.query \
        .options(selectinload(Service.allowed_organisations)) \
        .options(selectinload(Service.service_connection_requests)) \
        .all()

    sql = text("SELECT service_id, organisation_id FROM services_organisations")
    result_set = db.engine.execute(sql)
    service_orgs = [{"service_id": row[0], "organisation_id": row[1]} for row in result_set]

    sql = text("SELECT service_id, collaboration_id FROM services_collaborations")
    result_set = db.engine.execute(sql)
    services_colls = [{"service_id": row[0], "collaboration_id": row[1]} for row in result_set]

    services_json = jsonify(services).json
    for index, service in enumerate(services):
        service_json = services_json[index]
        service_json["collaborations_count"] = len([s for s in services_colls if s["service_id"] == service.id])
        service_json["organisations_count"] = len([s for s in service_orgs if s["service_id"] == service.id])
    return services_json, 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    confirm_write_access()

    data = current_request.get_json()
    _validate_ip_networks(data)

    data["status"] = STATUS_ACTIVE
    cleanse_short_name(data, "abbreviation")

    # Before the JSON is cleaned in the save method
    administrators = data.get("administrators", [])
    message = data.get("message", None)

    res = save(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]

    user = User.query.get(current_user_id())
    for administrator in administrators:
        invitation = ServiceInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
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
        invitation = ServiceInvitation(hash=token_urlsafe(), message=message, invitee_email=administrator,
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
    return None, 201


def _validate_ip_networks(data):
    ip_networks = data.get("ip_networks", None)
    if ip_networks:
        for ip_network in ip_networks:
            ipaddress.ip_network(ip_network["network_value"], False)


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    confirm_write_access()

    data = current_request.get_json()

    _validate_ip_networks(data)
    cleanse_short_name(data, "abbreviation")

    res = update(Service, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]
    service.ip_networks

    return res


@service_api.route("/allowed_organisations/<service_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def add_allowed_organisations(service_id):
    confirm_write_access()

    service = Service.query.get(service_id)
    data = current_request.get_json()
    allowed_organisations = data.get("allowed_organisations", None)

    org_sql = f"DELETE FROM services_organisations WHERE service_id = {service_id}"
    coll_sql = f"DELETE sc FROM services_collaborations sc INNER JOIN collaborations c on c.id = sc.collaboration_id " \
               f"WHERE sc.service_id = {service_id}"

    need_to_delete = not bool(allowed_organisations)
    if allowed_organisations:
        # find delta, e.g. which one to remove and which ones to add
        current_allowed = [org.id for org in service.allowed_organisations]
        new_allowed = [int(value["organisation_id"]) for value in allowed_organisations]

        to_remove = [org_id for org_id in current_allowed if org_id not in new_allowed]
        to_append = [org_id for org_id in new_allowed if org_id not in current_allowed]
        for org_id in to_remove:
            service.allowed_organisations.remove(Organisation.query.get(org_id))
        for org_id in to_append:
            service.allowed_organisations.append(Organisation.query.get(org_id))

        if to_remove:
            need_to_delete = True
            org_del_ids = ",".join([str(org_id) for org_id in to_remove])
            org_sql += f" AND organisation_id in ({org_del_ids})"
            coll_sql += f" AND c.organisation_id in ({org_del_ids})"

    else:
        service.allowed_organisations.clear()

    db.session.merge(service)

    if need_to_delete:
        db.engine.execute(text(org_sql))
        db.engine.execute(text(coll_sql))

    return None, 201


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    confirm_write_access()
    return delete(Service, service_id)
