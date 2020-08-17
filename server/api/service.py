# -*- coding: future_fstrings -*-
import ipaddress
import urllib.parse

from flask import Blueprint, request as current_request
from sqlalchemy import text, func, bindparam, String
from sqlalchemy.orm import load_only, contains_eager

from server.api.base import json_endpoint, query_param, replace_full_text_search_boolean_mode_chars
from server.auth.security import confirm_write_access, current_user_id, confirm_read_access, is_collaboration_admin, \
    is_organisation_admin
from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import Service, Collaboration, CollaborationMembership, Organisation, OrganisationMembership
from server.db.models import update, save, delete

service_api = Blueprint("service_api", __name__, url_prefix="/api/services")


@service_api.route("/search", strict_slashes=False)
@json_endpoint
def service_search():
    def is_org_member():
        user_id = current_user_id()
        return OrganisationMembership.query \
                   .options(load_only("id")) \
                   .filter(OrganisationMembership.user_id == user_id) \
                   .count() > 0

    def override_func():
        return is_collaboration_admin() or is_org_member()

    confirm_read_access(override_func=override_func)

    res = []
    q = query_param("q")

    if q and len(q):
        base_query = "SELECT id, entity_id, name, description FROM services "
        not_wild_card = "*" not in q
        if not_wild_card:
            q = replace_full_text_search_boolean_mode_chars(q)
            base_query += f"WHERE MATCH (name, entity_id, description) AGAINST (:q IN BOOLEAN MODE) " \
                          f"AND id > 0  ORDER BY NAME LIMIT {full_text_search_autocomplete_limit}"
        sql = text(base_query if not_wild_card else base_query + " ORDER BY NAME")
        if not_wild_card:
            sql = sql.bindparams(bindparam("q", type_=String))
        result_set = db.engine.execute(sql, {"q": f"{q}*"}) if not_wild_card else db.engine.execute(sql)

        res = [{"id": row[0], "entity_id": row[1], "name": row[2], "description": row[3]} for row in result_set]
    return res, 200


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


@service_api.route("/find_by_entity_id", strict_slashes=False)
@json_endpoint
def service_by_entity_id():
    entity_id = urllib.parse.unquote(query_param("entity_id"))
    return Service.query \
               .outerjoin(Service.allowed_organisations) \
               .options(contains_eager(Service.allowed_organisations)) \
               .filter(Service.entity_id == entity_id) \
               .one(), 200


@service_api.route("/<service_id>", strict_slashes=False)
@json_endpoint
def service_by_id(service_id):
    def _user_service():
        user_id = current_user_id()
        count = Service.query \
            .join(Service.collaborations) \
            .join(Collaboration.collaboration_memberships) \
            .filter(CollaborationMembership.user_id == user_id) \
            .filter(Service.id == service_id) \
            .count()
        return count > 0 or is_organisation_admin()

    confirm_read_access(override_func=_user_service)

    service = Service.query \
        .outerjoin(Service.collaborations) \
        .outerjoin(Collaboration.organisation) \
        .options(contains_eager(Service.collaborations)
                 .contains_eager(Collaboration.organisation)) \
        .filter(Service.id == service_id).one()
    service.allowed_organisations
    service.ip_networks
    return service, 200


@service_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def save_service():
    confirm_write_access()

    data = current_request.get_json()
    allowed_organisations = data.get("allowed_organisations", None)

    _validate_ip_networks(data)

    data["status"] = "active"

    res = save(Service, custom_json=data, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]
    service.ip_networks

    _add_allowed_organisations(allowed_organisations, service)

    return res


def _validate_ip_networks(data):
    ip_networks = data.get("ip_networks", None)
    if ip_networks:
        for ip_network in ip_networks:
            ipaddress.ip_network(ip_network["network_value"], False)


def _add_allowed_organisations(allowed_organisations, service):
    service.allowed_organisations.clear()
    if allowed_organisations:
        for value in allowed_organisations:
            organisation_id = value["organisation_id"]
            service.allowed_organisations.append(Organisation.query.get(organisation_id))
            service.public_visible = False
    else:
        service.public_visible = True
    db.session.merge(service)


@service_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_service():
    confirm_write_access()

    data = current_request.get_json()
    allowed_organisations = data.get("allowed_organisations", None)

    _validate_ip_networks(data)

    res = update(Service, allow_child_cascades=False, allowed_child_collections=["ip_networks"])
    service = res[0]
    service.ip_networks

    _add_allowed_organisations(allowed_organisations, service)

    return res


@service_api.route("/<service_id>", methods=["DELETE"], strict_slashes=False)
@json_endpoint
def delete_service(service_id):
    confirm_write_access()
    return delete(Service, service_id)
