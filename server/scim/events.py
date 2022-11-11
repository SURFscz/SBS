# -*- coding: future_fstrings -*-
import os
from typing import Union

from flask import current_app

from server.db.domain import User, Collaboration, Group, Organisation, Service
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change, \
    apply_collaboration_change, apply_service_changed


def _scim_enabled():
    return not os.environ.get("SCIM_DISABLED", None)


def broadcast_user_changed(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, current_app, user.id)


def broadcast_user_deleted(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, current_app, user.id, True)


def broadcast_organisation_changed(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, current_app, organisation.id)


def broadcast_organisation_deleted(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, current_app, organisation.id, True)


def broadcast_collaboration_changed(collaboration: Collaboration):
    if _scim_enabled():
        return current_app.executor.submit(apply_collaboration_change, current_app, collaboration.id)


def broadcast_collaboration_deleted(collaboration: Collaboration):
    if _scim_enabled():
        return current_app.executor.submit(apply_collaboration_change, current_app, collaboration.id, True)


def broadcast_group_changed(group: Group):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, current_app, group.id)


def broadcast_group_deleted(group: Group):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, current_app, group.id, True)


def broadcast_service_added(collaboration: Collaboration, service: Service):
    if _scim_enabled():
        return current_app.executor.submit(apply_service_changed, current_app, collaboration.id, service.id)


def broadcast_service_deleted(collaboration: Collaboration, service: Service):
    if _scim_enabled():
        return current_app.executor.submit(apply_service_changed, current_app, collaboration.id, service.id, True)
