import os
import json
from datetime import datetime
from functools import wraps

from flask import current_app

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Organisation
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed, apply_user_deletion


def broadcast_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not os.environ.get("SCIM_DISABLED", None):
            db.session.commit()
            return f(*args, **kwargs)

    return wrapper


@broadcast_endpoint
def broadcast_user_changed(user_id: int):
    # enqueue one task per target service so each remote SCIM service gets a FIFO queue
    services = _services_for_user(user_id)
    payload = {"action": "user_changed", "user_id": user_id, "deletion": False}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_user_deleted(external_id, collaboration_identifiers):
    services = _services_for_collaborations(collaboration_identifiers)
    payload = {"action": "user_deleted", "external_id": external_id, "collaboration_ids": collaboration_identifiers}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_organisation_deleted(organisation_id: int):
    services = _services_for_organisation(organisation_id)
    payload = {"action": "organisation_deleted", "organisation_id": organisation_id, "deletion": True}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration_id: int):
    services = _services_for_collaboration(collaboration_id)
    payload = {"action": "collaboration_changed", "collaboration_id": collaboration_id, "deletion": False}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration_id: int):
    services = _services_for_collaboration(collaboration_id)
    payload = {"action": "collaboration_deleted", "collaboration_id": collaboration_id, "deletion": True}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_group_changed(group_id: int):
    services = _services_for_group(group_id)
    payload = {"action": "group_changed", "group_id": group_id, "deletion": False}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_group_deleted(group_id: int):
    services = _services_for_group(group_id)
    payload = {"action": "group_deleted", "group_id": group_id, "deletion": True}
    for s in services:
        _enqueue_service_task(s.id, payload)
    return True


@broadcast_endpoint
def broadcast_service_added(collaboration_id: int, service_id: int):
    payload = {"action": "service_changed", "collaboration_id": collaboration_id, "service_id": service_id, "deletion": False}
    _enqueue_service_task(service_id, payload)
    return True


@broadcast_endpoint
def broadcast_service_deleted(collaboration_id: int, service_id: int):
    payload = {"action": "service_changed", "collaboration_id": collaboration_id, "service_id": service_id, "deletion": True}
    _enqueue_service_task(service_id, payload)
    return True


# --- Redis enqueue helpers and service discovery ---
def _enqueue_service_task(service_id: int, payload: dict):
    key = f"scim:queue:service:{service_id}"
    try:
        # add a single UTC timestamp here so all tasks have a consistent enqueue time
        payload_with_ts = {**payload, "timestamp": datetime.now(datetime.timezone.utc).isoformat() + "Z"}
        current_app.redis_client.rpush(key, json.dumps(payload_with_ts))
    except Exception:
        logger = getattr(current_app, 'logger', None)
        if logger:
            logger.exception(f"Failed to enqueue SCIM task to {key}")


def _unique_services(services):
    unique = {}
    for s in services:
        if s and getattr(s, 'scim_enabled', True):
            unique[s.id] = s
    return list(unique.values())


def _services_for_user(user_id: int):
    user = User.query.filter(User.id == user_id).one()
    collaborations = [m.collaboration for m in user.collaboration_memberships if m.is_active()]
    all_services = []
    for co in collaborations:
        all_services.extend(co.services)
    return _unique_services(all_services)


def _services_for_collaboration(collaboration_id: int):
    coll = Collaboration.query.filter(Collaboration.id == collaboration_id).one()
    return _unique_services(coll.services)


def _services_for_group(group_id: int):
    group = Group.query.filter(Group.id == group_id).one()
    return _unique_services(group.collaboration.services)


def _services_for_collaborations(collaboration_ids):
    cols = Collaboration.query.filter(Collaboration.id.in_(collaboration_ids)).all()
    all_services = []
    for co in cols:
        all_services.extend(co.services)
    return _unique_services(all_services)


def _services_for_organisation(organisation_id: int):
    org = Organisation.query.filter(Organisation.id == organisation_id).one()
    all_services = []
    for co in org.collaborations:
        all_services.extend(co.services)
    return _unique_services(all_services)
