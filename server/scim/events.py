import os
from functools import wraps

from flask import current_app

from server.db.domain import User, Collaboration, Group, Organisation, Service
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed, apply_user_deletion


def broadcast_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not os.environ.get("SCIM_DISABLED", None):
            return f(*args, **kwargs)

    return wrapper


@broadcast_endpoint
def broadcast_user_changed(user: User):
    return current_app.executor.submit(apply_user_change, current_app, user.id)


@broadcast_endpoint
def broadcast_user_deleted(external_id, collaboration_identifiers):
    return current_app.executor.submit(apply_user_deletion, current_app, external_id, collaboration_identifiers)


@broadcast_endpoint
def broadcast_organisation_service_added(organisation: Organisation, service: Service):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation.id, service.id)


@broadcast_endpoint
def broadcast_organisation_service_deleted(organisation: Organisation, service: Service):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation.id, service.id, True)


@broadcast_endpoint
def broadcast_organisation_deleted(organisation: Organisation):
    return current_app.sync_executor.submit(apply_organisation_change, current_app, organisation.id, None, True)


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration: Collaboration):
    return current_app.executor.submit(apply_collaboration_change, current_app, collaboration.id)


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration: Collaboration):
    return current_app.sync_executor.submit(apply_collaboration_change, current_app, collaboration.id, True)


@broadcast_endpoint
def broadcast_group_changed(group: Group):
    return current_app.executor.submit(apply_group_change, current_app, group.id)


@broadcast_endpoint
def broadcast_group_deleted(group: Group):
    return current_app.sync_executor.submit(apply_group_change, current_app, group.id, True)


@broadcast_endpoint
def broadcast_service_added(collaboration: Collaboration, service: Service):
    return current_app.executor.submit(apply_service_changed, current_app, collaboration.id, service.id)


@broadcast_endpoint
def broadcast_service_deleted(collaboration: Collaboration, service: Service):
    return current_app.sync_executor.submit(apply_service_changed, current_app, collaboration.id, service.id, True)
