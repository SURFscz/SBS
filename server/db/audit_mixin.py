# -*- coding: future_fstrings -*-
import os

from flask import session
from flask_jsontools.formatting import JsonSerializableBase
from sqlalchemy import MetaData
from sqlalchemy import event, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import class_mapper
from sqlalchemy.orm.attributes import get_history

from server.api.dynamic_extended_json_encoder import DynamicExtendedJSONEncoder
from server.db.db import db

ACTION_CREATE = 1
ACTION_UPDATE = 2
ACTION_DELETE = 3

ignore_attributes = ["logo", "created_by", "updated_by", "created_at", "updated_at", "last_login_date"]

dynamicExtendedJSONEncoder = DynamicExtendedJSONEncoder()

relationship_configuration = {
    "groups": ["collaboration_memberships", "invitations"],
    "collaborations": ["services"],
    "organisations": ["services"],
    "services": ["allowed_organisations", "service_groups"]
}


class AuditLog(JsonSerializableBase, db.Model):
    __tablename__ = "audit_logs"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column("user_id", db.Integer())
    subject_id = db.Column("subject_id", db.Integer())
    target_type = db.Column("target_type", db.String(length=100), nullable=False)
    target_id = db.Column("target_id", db.Integer())
    target_name = db.Column("target_name", db.String(length=255), nullable=True)
    parent_id = db.Column("parent_id", db.Integer())
    parent_name = db.Column("parent_name", db.String(length=100), nullable=True)
    action = db.Column("action", db.Integer())
    state_before = db.Column("state_before", db.Text())
    state_after = db.Column("state_after", db.Text())
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def __init__(self, current_user_id, subject_id, target_type, target_id, target_name, parent_id, parent_name, action,
                 state_before, state_after):
        self.user_id = current_user_id
        self.subject_id = subject_id
        self.target_type = target_type
        self.target_id = target_id
        self.target_name = target_name
        self.parent_id = parent_id
        self.parent_name = parent_name
        self.action = action
        self.state_before = state_before
        self.state_after = state_after

    def save(self, connection):
        connection.execute(
            self.__table__.insert(),
            user_id=self.user_id,
            subject_id=self.subject_id,
            target_type=self.target_type,
            target_id=self.target_id,
            target_name=self.target_name,
            parent_id=self.parent_id,
            parent_name=self.parent_name,
            action=self.action,
            state_before=self.state_before,
            state_after=self.state_after
        )


def find_subject(mapper, target):
    if target.__tablename__ == "users":
        return getattr(target, "id")
    for attr in mapper.column_attrs:
        if attr.key == "user_id":
            return getattr(target, "user_id")
    return None


def target_state(mapper, target):
    attributes = {attr.key: getattr(target, attr.key) for attr in mapper.column_attrs
                  if attr.key not in ignore_attributes}
    return dynamicExtendedJSONEncoder.encode(attributes)


parent_configuration = {
    "organisation_memberships": ("organisation_id", "organisations"),
    "collaboration_memberships": ("collaboration_id", "collaborations"),
    "groups": ("collaboration_id", "collaborations"),
    "collaborations": ("organisation_id", "organisations"),
    "join_requests": ("collaboration_id", "collaborations"),
    "invitations": ("collaboration_id", "collaborations"),
    "organisation_invitations": ("organisation_id", "organisations"),
    "api_keys": ("organisation_id", "organisations"),
    "schac_home_organisations": ("organisation_id", "organisations"),
    "collaboration_requests": ("organisation_id", "organisations"),
    "service_connection_requests": ("collaboration_id", "collaborations"),
    "ip_networks": ("service_id", "services"),
    "service_groups": ("service_id", "services")
}


def parent_info(target):
    conf = parent_configuration.get(target.__tablename__)
    return (getattr(target, conf[0]), conf[1]) if conf else (None, None)


def get_target_name(target):
    return getattr(target, "name") if hasattr(target, "name") else None


class AuditMixin(JsonSerializableBase):

    @staticmethod
    def create_audit(connection, subject_id, target, parent_id, parent_name, action,
                     **kwargs):
        if not os.environ.get("SEEDING"):
            from server.auth.security import current_user_id

            user_id = None
            if hasattr(target, "user_id"):
                user_id = getattr(target, "user_id")
            if not user_id:
                user_id = current_user_id() if session and "user" in session and "id" in session["user"] else None
            audit = AuditLog(
                user_id,
                subject_id,
                target.__tablename__,
                target.id,
                get_target_name(target),
                parent_id,
                parent_name,
                action,
                kwargs.get("state_before"),
                kwargs.get("state_after")
            )
            audit.save(connection)

    @classmethod
    def __declare_last__(cls):
        event.listen(cls, "after_insert", cls.audit_insert)
        event.listen(cls, "after_delete", cls.audit_delete)
        event.listen(cls, "after_update", cls.audit_update)

        table_name = cls.__dict__["__tablename__"]
        if table_name in relationship_configuration:
            for relation in relationship_configuration[table_name]:
                event.listen(cls.__dict__[relation], "append", cls.audit_relationship_append, retval=False)
                event.listen(cls.__dict__[relation], "remove", cls.audit_relationship_remove, retval=False)

    @staticmethod
    def audit_relationship_append(target, value, _):
        mapper = class_mapper(value.__class__)
        state_after = target_state(mapper, value)
        subject_id = find_subject(mapper, value)
        connection = db.get_engine().connect()
        target.create_audit(connection, subject_id, value, target.id, target.__tablename__, ACTION_CREATE,
                            state_after=state_after)

    @staticmethod
    def audit_relationship_remove(target, value, _):
        mapper = class_mapper(value.__class__)
        state_before = target_state(mapper, value)
        subject_id = find_subject(mapper, value)
        connection = db.get_engine().connect()
        target.create_audit(connection, subject_id, value, target.id, target.__tablename__, ACTION_DELETE,
                            state_before=state_before)

    @staticmethod
    def audit_insert(mapper, connection, target):
        state_after = target_state(mapper, target)
        subject_id = find_subject(mapper, target)
        # connection, subject_id, target_type, target_id, parent_id, parent_name, action
        pi = parent_info(target)
        target.create_audit(connection, subject_id, target, pi[0], pi[1], ACTION_CREATE, state_after=state_after)

    @staticmethod
    def audit_delete(mapper, connection, target):
        state_before = target_state(mapper, target)
        subject_id = find_subject(mapper, target)
        # connection, subject_id, target_type, target_id, parent_id, parent_name, action
        pi = parent_info(target)
        target.create_audit(connection, subject_id, target, pi[0], pi[1], ACTION_DELETE, state_before=state_before)

    @staticmethod
    def audit_update(mapper, connection, target):
        state_before = {}
        state_after = {}
        inspr = inspect(target)
        attrs = mapper.column_attrs
        for attr in attrs:
            if attr.key not in ignore_attributes:
                hist = getattr(inspr.attrs, attr.key).history
                if hist.has_changes():
                    state_before_list = get_history(target, attr.key)[2]
                    if isinstance(state_before_list, list):
                        state_before[attr.key] = state_before_list.pop()
                        state_after[attr.key] = getattr(target, attr.key)
        # connection, subject_id, target_type, target_id, parent_id, parent_name, action
        pi = parent_info(target)
        if state_before and state_after:
            target.create_audit(connection, find_subject(mapper, target), target, pi[0], pi[1], ACTION_UPDATE,
                                state_before=dynamicExtendedJSONEncoder.encode(state_before),
                                state_after=dynamicExtendedJSONEncoder.encode(state_after))


metadata = MetaData()
Base = declarative_base(cls=(AuditMixin,), metadata=metadata)
