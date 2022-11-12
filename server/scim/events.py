# -*- coding: future_fstrings -*-
import os
from functools import wraps

from flask import current_app

from server.db.domain import User, Collaboration, Group, Organisation, Service
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed


def _scim_enabled():
    return not os.environ.get("SCIM_DISABLED", None)


def broadcast_endpoint(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if _scim_enabled():
            return f(*args, **kwargs)

    return wrapper


@broadcast_endpoint
def broadcast_user_changed(user: User):
    return current_app.executor.submit(apply_user_change, current_app, user.id)


@broadcast_endpoint
def broadcast_user_deleted(user: User):
    return current_app.executor.submit(apply_user_change, current_app, user.id, True)


@broadcast_endpoint
def broadcast_organisation_changed(organisation: Organisation):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation.id)


@broadcast_endpoint
def broadcast_organisation_deleted(organisation: Organisation):
    return current_app.executor.submit(apply_organisation_change, current_app, organisation.id, True)


@broadcast_endpoint
def broadcast_collaboration_changed(collaboration: Collaboration):
    return apply_collaboration_change( current_app, collaboration.id)
    # return current_app.executor.submit(apply_collaboration_change, current_app, collaboration.id)


@broadcast_endpoint
def broadcast_collaboration_deleted(collaboration: Collaboration):
    return apply_collaboration_change( current_app, collaboration.id, True)
    # return current_app.executor.submit(apply_collaboration_change, current_app, collaboration.id, True)


@broadcast_endpoint
def broadcast_group_changed(group: Group):
    apply_group_change( current_app, group.id)
    # return current_app.executor.submit(apply_group_change, current_app, group.id)


@broadcast_endpoint
def broadcast_group_deleted(group: Group):
    return apply_group_change( current_app, group.id, True)
    # return current_app.executor.submit(apply_group_change, current_app, group.id, True)


@broadcast_endpoint
def broadcast_service_added(collaboration: Collaboration, service: Service):
    return apply_service_changed( current_app, collaboration.id, service.id)
    # return current_app.executor.submit(apply_service_changed, current_app, collaboration.id, service.id)


@broadcast_endpoint
def broadcast_service_deleted(collaboration: Collaboration, service: Service):
    return apply_service_changed( current_app, collaboration.id, service.id, True)
    # return current_app.executor.submit(apply_service_changed, current_app, collaboration.id, service.id, True)
