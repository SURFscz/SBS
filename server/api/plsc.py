# -*- coding: future_fstrings -*-

from flask import Blueprint, jsonify, Response, current_app, stream_with_context

from server.api.base import json_endpoint, auth_filter
from server.auth.security import confirm_read_access, confirm_ipaddress_access
from server.db.db import db
from server.db.domain import IpNetwork
from server.db.logo_mixin import logo_url

plsc_api = Blueprint("plsc_api", __name__, url_prefix="/api/plsc")


def _find_user_id(collaboration_memberships, collaboration_membership_id):
    user_ids = [cm["user_id"] for cm in collaboration_memberships if cm["id"] == collaboration_membership_id]
    return user_ids[0]


def _find_by_id(seq, fk, value):
    return [row for row in seq if row[fk] == value]


def _find_by_identifiers(seq, fk, values):
    return [row for row in seq if row[fk] in values]


def _identifiers_only(seq):
    return [r["id"] for r in seq]


def internal_sync():
    result = {"organisations": [], "users": []}
    rs = db.engine.execute("SELECT name, organisation_id FROM schac_home_organisations")
    schac_home_organisations = [{"name": row[0], "organisation_id": row[1]} for row in rs]
    rs = db.engine.execute("SELECT id, name, entity_id, contact_email, uuid4, ldap_password, accepted_user_policy, "
                           "support_email, security_email FROM services")
    services = [{"id": row[0], "name": row[1], "entity_id": row[2], "contact_email": row[3],
                 "logo": logo_url("services", row[4]), "ldap_password": row[5],
                 "accepted_user_policy": row[6], "support_email": row[7], "security_email": row[6]} for row in rs]
    for service in services:
        if not service["contact_email"]:
            rs = db.engine.execute(f"select u.email from users u where id in "
                                   f"(select user_id from service_memberships "
                                   f"where service_id = {service['id']}) limit 1")
            for row in rs:
                service["contact_email"] = row[0]
    rs = db.engine.execute("SELECT service_id, organisation_id FROM services_organisations")
    services_organisations = [{"service_id": row[0], "organisation_id": row[1]} for row in rs]
    rs = db.engine.execute("SELECT service_id, collaboration_id FROM services_collaborations")
    services_collaborations = [{"service_id": row[0], "collaboration_id": row[1]} for row in rs]
    rs = db.engine.execute("SELECT role, user_id, organisation_id FROM organisation_memberships")
    organisation_memberships = [{"role": row[0], "user_id": row[1], "organisation_id": row[2]} for row in rs]
    rs = db.engine.execute("SELECT id, role, user_id, collaboration_id, status FROM collaboration_memberships")
    collaboration_memberships = [
        {"id": row[0], "role": row[1], "user_id": row[2], "collaboration_id": row[3], "status": row[4]} for row
        in rs]
    rs = db.engine.execute("SELECT collaboration_membership_id, group_id FROM collaboration_memberships_groups")
    collaboration_memberships_groups = [{"collaboration_membership_id": row[0], "group_id": row[1]} for row in rs]
    rs = db.engine.execute(
        "SELECT id, identifier, name, short_name, global_urn, organisation_id, status, description, "
        "uuid4, website_url from collaborations")
    collaborations = [
        {"id": row[0], "identifier": row[1], "name": row[2], "short_name": row[3], "global_urn": row[4],
         'organisation_id': row[5], "status": row[6], "description": row[7],
         "logo": logo_url("collaborations", row[8]), "website_url": row[9]} for row in rs]
    rs = db.engine.execute(
        "SELECT id, name, short_name, global_urn, identifier, collaboration_id, description FROM `groups`")
    groups = [
        {"id": row[0], "name": row[1], "short_name": row[2], "global_urn": row[3], "identifier": row[4],
         "collaboration_id": row[5], "description": row[6]}
        for row in rs]
    rs = db.engine.execute("SELECT ct.collaboration_id, t.tag_value FROM collaboration_tags ct "
                           "INNER JOIN tags t ON t.id = ct.tag_id")
    tags = [{"collaboration_id": row[0], "tag_value": row[1]} for row in rs]
    for coll in collaborations:
        collaboration_id = coll["id"]
        coll["groups"] = _find_by_id(groups, "collaboration_id", collaboration_id)
        for group in coll["groups"]:
            group["collaboration_memberships"] = _find_by_id(collaboration_memberships_groups, "group_id",
                                                             group["id"])
            for collaboration_membership in group["collaboration_memberships"]:
                collaboration_membership["user_id"] = _find_user_id(collaboration_memberships,
                                                                    collaboration_membership[
                                                                        "collaboration_membership_id"])
        service_identifiers = _find_by_id(services_collaborations, "collaboration_id", collaboration_id)
        coll["services"] = _identifiers_only(
            _find_by_identifiers(services, "id", [si["service_id"] for si in service_identifiers]))
        coll["collaboration_memberships"] = _find_by_id(collaboration_memberships, "collaboration_id",
                                                        collaboration_id)
        coll["tags"] = [tag["tag_value"] for tag in tags if tag["collaboration_id"] == collaboration_id]
    rs = db.engine.execute("SELECT id, name, identifier, short_name, uuid4 FROM organisations")
    for row in rs:
        organisation_id = row[0]
        service_identifiers = _find_by_id(services_organisations, "organisation_id", organisation_id)
        result["organisations"].append({
            "id": organisation_id, "name": row[1], "identifier": row[2], "short_name": row[3],
            "logo": logo_url("organisations", row[4]),
            "schac_home_organisations": _find_by_id(schac_home_organisations, "organisation_id", organisation_id),
            "organisation_memberships": _find_by_id(organisation_memberships, "organisation_id", organisation_id),
            "collaborations": _find_by_id(collaborations, "organisation_id", organisation_id),
            "services": _identifiers_only(
                _find_by_identifiers(services, "id", [si["service_id"] for si in service_identifiers]))
        })
    result["services"] = services
    rs = db.engine.execute("SELECT id, uid, name, given_name, family_name, email, scoped_affiliation, "
                           "eduperson_principal_name, username, last_login_date FROM users")
    for row in rs:
        user_row = {"id": row[0], "uid": row[1], "name": row[2], "given_name": row[3], "family_name": row[4],
                    "email": row[5], "scoped_affiliation": row[6], "eduperson_principal_name": row[7],
                    "username": row[8], "last_login_date": str(row[9])}
        rs_ssh_keys = db.engine.execute(f"SELECT ssh_value FROM ssh_keys WHERE user_id = {row[0]}")
        user_row["ssh_keys"] = [r[0] for r in rs_ssh_keys]
        user_ip_networks = db.engine.execute(f"SELECT network_value FROM user_ip_networks WHERE user_id = {row[0]}")
        user_row["user_ip_networks"] = [r[0] for r in user_ip_networks]
        service_aups = db.engine.execute(f"SELECT aup_url, service_id, agreed_at FROM service_aups "
                                         f"WHERE user_id = {row[0]}")
        user_row["accepted_aups"] = [{"url": r[0], "service_id": r[1], "agreed_at": str(r[2])} for r in
                                     service_aups]
        result["users"].append(user_row)
    return result


@plsc_api.route("/sync", methods=["GET"], strict_slashes=False)
def sync():
    auth_filter(current_app.app_config)
    confirm_read_access()

    def do_sync():
        # Yielding the first (empty) bytes will force to write the headers
        yield b""

        result = internal_sync()

        yield jsonify(result).data

    return Response(stream_with_context(do_sync()), content_type="application/json", mimetype="application/json",
                    status=200)


@plsc_api.route("/syncing", methods=["GET"], strict_slashes=False)
@json_endpoint
def syncing():
    confirm_read_access()

    return internal_sync(), 200


@plsc_api.route("/ip_ranges", strict_slashes=False)
@json_endpoint
def ip_ranges():
    confirm_ipaddress_access()
    data = IpNetwork.query.all()
    ip_networks = set(r.network_value for r in data)
    return {"service_ipranges": list(ip_networks)}, 200
