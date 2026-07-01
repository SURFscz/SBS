import os
from concurrent.futures import Future
from functools import wraps
from typing import Callable, Dict, List, Sequence
from urllib.parse import urlparse

from flask import current_app

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Organisation, Service
from server.scim.futures import ScimBroadcastFuture
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed, apply_user_deletion


def broadcast_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not os.environ.get("SCIM_DISABLED", None):
            db.session.commit()
            return f(*args, **kwargs)

    return wrapper


def _normalize_endpoint_url(scim_url: str) -> str:
    if not scim_url:
        return ""
    parsed = urlparse(scim_url)
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
    if parsed.query:
        base += f"?{parsed.query}"
    return base


def _unique_services(services: Sequence[Service]) -> List[Service]:
    unique: Dict[int, Service] = {}
    for service in services:
        if service and getattr(service, "scim_enabled", True) and service.scim_url:
            unique[service.id] = service
    return list(unique.values())


def _group_services_by_endpoint(services: Sequence[Service]) -> Dict[str, List[int]]:
    grouped: Dict[str, List[int]] = {}
    for service in _unique_services(services):
        endpoint = _normalize_endpoint_url(service.scim_url)
        grouped.setdefault(endpoint, []).append(service.id)
    return grouped


def _submit_by_endpoint(services: Sequence[Service], fn: Callable, *args) -> ScimBroadcastFuture:
    app = current_app._get_current_object()
    futures = []
    for endpoint_url, service_ids in _group_services_by_endpoint(services).items():
        if os.environ.get("SCIM_FIFO_SYNC"):
            future: Future = Future()
            try:
                future.set_result(fn(app, *args, service_ids))
            except Exception as exc:
                future.set_exception(exc)
            futures.append(future)
        else:
            futures.append(app.scim_fifo_pool.submit(endpoint_url, fn, app, *args, service_ids))
    return ScimBroadcastFuture(futures)


def _services_for_user(user_id: int) -> List[Service]:
    user = User.query.filter(User.id == user_id).one()
    collaborations = [m.collaboration for m in user.collaboration_memberships if m.is_active()]
    services: List[Service] = []
    for collaboration in collaborations:
        services.extend(collaboration.services)
    return _unique_services(services)


def _services_for_collaboration(collaboration_id: int) -> List[Service]:
    collaboration = Collaboration.query.filter(Collaboration.id == collaboration_id).one()
    return _unique_services(collaboration.services)


def _services_for_group(group_id: int) -> List[Service]:
    group = Group.query.filter(Group.id == group_id).one()
    return _unique_services(group.collaboration.services)


def _services_for_collaborations(collaboration_ids: Sequence[int]) -> List[Service]:
    collaborations = Collaboration.query.filter(Collaboration.id.in_(collaboration_ids)).all()
    services: List[Service] = []
    for collaboration in collaborations:
        services.extend(collaboration.services)
    return _unique_services(services)


def _services_for_organisation(organisation_id: int) -> List[Service]:
    organisation = Organisation.query.filter(Organisation.id == organisation_id).one()
    services: List[Service] = []
    for collaboration in organisation.collaborations:
        services.extend(collaboration.services)
    return _unique_services(services)


@broadcast_endpoint
def broadcast_user_changed(user_id: int):
    return _submit_by_endpoint(_services_for_user(user_id), apply_user_change, user_id)


@broadcast_endpoint
def broadcast_user_deleted(external_id, collaboration_identifiers):
    return _submit_by_endpoint(
        _services_for_collaborations(collaboration_identifiers),
        apply_user_deletion,
        external_id,
        collaboration_identifiers,
    )


@broadcast_endpoint
def broadcast_organisation_deleted(organisation_id: int):
    return _submit_by_endpoint(
        _services_for_organisation(organisation_id),
        apply_organisation_change,
        organisation_id,
        True,
    )


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration_id: int):
    return _submit_by_endpoint(
        _services_for_collaboration(collaboration_id),
        apply_collaboration_change,
        collaboration_id,
        False,
    )


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration_id: int):
    return _submit_by_endpoint(
        _services_for_collaboration(collaboration_id),
        apply_collaboration_change,
        collaboration_id,
        True,
    )


@broadcast_endpoint
def broadcast_group_changed(group_id: int):
    return _submit_by_endpoint(_services_for_group(group_id), apply_group_change, group_id, False)


@broadcast_endpoint
def broadcast_group_deleted(group_id: int):
    return _submit_by_endpoint(_services_for_group(group_id), apply_group_change, group_id, True)


@broadcast_endpoint
def broadcast_service_added(collaboration_id: int, service_id: int):
    service = Service.query.filter(Service.id == service_id).one()
    return _submit_by_endpoint([service], apply_service_changed, collaboration_id, service_id, False)


@broadcast_endpoint
def broadcast_service_deleted(collaboration_id: int, service_id: int):
    service = Service.query.filter(Service.id == service_id).one()
    return _submit_by_endpoint([service], apply_service_changed, collaboration_id, service_id, True)
