# -*- coding: future_fstrings -*-
import os
from typing import Union

from flask import current_app

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Organisation
from server.scim.scim import apply_user_change, apply_group_change, apply_organisation_change


def _scim_enabled():
    # This method is called before any event is submitted to the executor and we need db changes propagated
    db.session.commit()
    return not os.environ.get("SCIM_DISABLED", None)


def broadcast_user_changed(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, user)


def broadcast_user_deleted(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, user, True)


def broadcast_organisation_changed(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, organisation)


def broadcast_organisation_deleted(organisation: Organisation):
    if _scim_enabled():
        return current_app.executor.submit(apply_organisation_change, organisation, True)


def broadcast_collaboration_changed(group: Union[Group, Collaboration]):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, group)


def broadcast_collaboration_deleted(group: Union[Group, Collaboration]):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, group, True)
