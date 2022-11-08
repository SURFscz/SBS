# -*- coding: future_fstrings -*-
import os
from typing import Union

from flask import current_app

from server.db.domain import User, Collaboration, Group
from server.scim.scim import apply_user_change, apply_group_change


def _scim_enabled():
    return not os.environ.get("SCIM_DISABLED", None)


def new_user(user: User):
    if _scim_enabled():
        return current_app.executor.submit(apply_user_change, user)


def new_collaboration_membership(group: Union[Group, Collaboration]):
    if _scim_enabled():
        return current_app.executor.submit(apply_group_change, group)
