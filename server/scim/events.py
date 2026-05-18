import os
import json
from datetime import datetime, timezone
from functools import wraps
from urllib.parse import urlparse

from flask import current_app

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Organisation
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed, apply_user_deletion
from server.scim.queue import ScimQueue


def broadcast_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not os.environ.get("SCIM_DISABLED", None):
            db.session.commit()
            return f(*args, **kwargs)

    return wrapper


@broadcast_endpoint
def broadcast_user_changed(user_id: int):
    # enqueue one task per target endpoint so each remote SCIM server gets a FIFO queue
    services = _services_for_user(user_id)
    payload = {"action": "user_changed", "user_id": user_id, "deletion": False}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_user_deleted(external_id, collaboration_identifiers):
    services = _services_for_collaborations(collaboration_identifiers)
    payload = {"action": "user_deleted", "external_id": external_id, "collaboration_ids": collaboration_identifiers}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_organisation_deleted(organisation_id: int):
    services = _services_for_organisation(organisation_id)
    payload = {"action": "organisation_deleted", "organisation_id": organisation_id, "deletion": True}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration_id: int):
    services = _services_for_collaboration(collaboration_id)
    payload = {"action": "collaboration_changed", "collaboration_id": collaboration_id, "deletion": False}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration_id: int):
    services = _services_for_collaboration(collaboration_id)
    payload = {"action": "collaboration_deleted", "collaboration_id": collaboration_id, "deletion": True}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_group_changed(group_id: int):
    services = _services_for_group(group_id)
    payload = {"action": "group_changed", "group_id": group_id, "deletion": False}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_group_deleted(group_id: int):
    services = _services_for_group(group_id)
    payload = {"action": "group_deleted", "group_id": group_id, "deletion": True}
    _enqueue_by_endpoint(services, payload)
    return True


@broadcast_endpoint
def broadcast_service_added(collaboration_id: int, service_id: int):
    from server.db.domain import Service
    service = Service.query.filter(Service.id == service_id).one()
    payload = {"action": "service_changed", "collaboration_id": collaboration_id, "service_id": service_id, "deletion": False}
    _enqueue_by_endpoint([service], payload)
    return True


@broadcast_endpoint
def broadcast_service_deleted(collaboration_id: int, service_id: int):
    from server.db.domain import Service
    service = Service.query.filter(Service.id == service_id).one()
    payload = {"action": "service_changed", "collaboration_id": collaboration_id, "service_id": service_id, "deletion": True}
    _enqueue_by_endpoint([service], payload)
    return True


# --- Redis enqueue helpers and service discovery ---
def _normalize_endpoint_url(scim_url: str) -> str:
    """Normalize SCIM endpoint URL for consistent keying (removes trailing slash, standardizes scheme)."""
    if not scim_url:
        return ""
    parsed = urlparse(scim_url)
    # Reconstruct without path trailing slash
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
    if parsed.query:
        base += f"?{parsed.query}"
    return base


def _enqueue_by_endpoint(services, payload: dict):
    """Group services by endpoint URL and enqueue once per unique endpoint.
    
    Args:
        services: List of Service objects
        payload: Base event payload dict
    
    Services pointing to the same SCIM endpoint are grouped together so that
    events are queued per endpoint (not per service), maintaining FIFO ordering
    for concurrent calls to the same remote SCIM server while allowing parallel
    processing across different endpoints.
    """
    # Group services by normalized endpoint URL
    endpoint_groups = {}
    for s in services:
        if s and getattr(s, 'scim_enabled', True) and s.scim_url:
            normalized_url = _normalize_endpoint_url(s.scim_url)
            if normalized_url not in endpoint_groups:
                endpoint_groups[normalized_url] = []
            endpoint_groups[normalized_url].append(s.id)
    
    # Enqueue once per endpoint with all service IDs for that endpoint
    for endpoint_url, service_ids in endpoint_groups.items():
        _enqueue_service_task(endpoint_url, service_ids, payload)


def _enqueue_service_task(endpoint_url: str, service_ids: list, payload: dict):
    """Enqueue a SCIM task to the per-endpoint Redis queue.
    
    Args:
        endpoint_url: Normalized SCIM endpoint URL (keying)
        service_ids: List of service IDs to apply this event to
        payload: Base event payload dict
    """
    try:
        # Build enveloped payload with service_ids and timestamp
        payload_with_metadata = {
            **payload,
            "service_ids": service_ids,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Use ScimQueue to enqueue to per-endpoint Redis key
        queue = ScimQueue(current_app.redis_client)
        queue.enqueue_by_endpoint(endpoint_url, json.dumps(payload_with_metadata))
    except Exception:
        logger = getattr(current_app, 'logger', None)
        if logger:
            logger.exception(f"Failed to enqueue SCIM task to endpoint {endpoint_url}")


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
