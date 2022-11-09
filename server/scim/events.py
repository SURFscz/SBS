# -*- coding: future_fstrings -*-
import os
from typing import Union

from flask import current_app

from server.db.domain import User, Collaboration, Group, Organisation
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change


def _scim_enabled():
    return not os.environ.get("SCIM_DISABLED", None)


def user_changed(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, user)


def user_deleted(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, user, True)


def organisation_service_added(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, organisation)


def organisation_service_removed(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, organisation, True)


def collaboration_changed(group: Union[Group, Collaboration]):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, group)


def collaboration_deleted(group: Union[Group, Collaboration]):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, group, True)
