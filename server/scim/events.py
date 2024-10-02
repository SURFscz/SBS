import os
from functools import wraps

from flask import current_app

from server.db.db import db
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
    return current_app.executor.submit(apply_user_change, current_app, user_id)


@broadcast_endpoint
def broadcast_user_deleted(external_id, collaboration_identifiers):
    return current_app.executor.submit(apply_user_deletion, current_app, external_id, collaboration_identifiers)


@broadcast_endpoint
def broadcast_organisation_service_added(organisation_id: int, service_id: int):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation_id, service_id, False)


@broadcast_endpoint
def broadcast_organisation_service_deleted(organisation_id: int, service_id: int):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation_id, service_id, True)


@broadcast_endpoint
def broadcast_organisation_deleted(organisation_id: int):
    return current_app.sync_executor.submit(apply_organisation_change, current_app, organisation_id, None, True)


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration_id: int):
    return current_app.executor.submit(apply_collaboration_change, current_app, collaboration_id, False)


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration_id: int):
    return current_app.sync_executor.submit(apply_collaboration_change, current_app, collaboration_id, True)


@broadcast_endpoint
def broadcast_group_changed(group_id: int):
    return current_app.executor.submit(apply_group_change, current_app, group_id, False)


@broadcast_endpoint
def broadcast_group_deleted(group_id: int):
    return current_app.sync_executor.submit(apply_group_change, current_app, group_id, True)


@broadcast_endpoint
def broadcast_service_added(collaboration_id: int, service_id: int):
    return current_app.executor.submit(apply_service_changed, current_app, collaboration_id, service_id, False)


@broadcast_endpoint
def broadcast_service_deleted(collaboration_id: int, service_id: int):
    return current_app.sync_executor.submit(apply_service_changed, current_app, collaboration_id, service_id, True)
