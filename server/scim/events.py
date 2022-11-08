# -*- coding: future_fstrings -*-
from typing import Union

from flask import current_app

from server.db.domain import User, Collaboration, Group
from server.scim.scim import apply_user_change, apply_group_change


def new_user(user: User):
    current_app.executor.submit(apply_user_change, user)


def new_collaboration_membership(group: Union[Group, Collaboration]):
    current_app.executor.submit(apply_group_change, group)
