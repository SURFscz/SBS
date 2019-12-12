# -*- coding: future_fstrings -*-
from flask import session
from flask_jsontools.formatting import JsonSerializableBase
from sqlalchemy import MetaData
from sqlalchemy import event, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm.attributes import get_history

from server.api.dynamic_extended_json_encoder import DynamicExtendedJSONEncoder
from server.db.db import db

ACTION_CREATE = 1
ACTION_UPDATE = 2
ACTION_DELETE = 3

dynamicExtendedJSONEncoder = DynamicExtendedJSONEncoder()


class AuditLog(JsonSerializableBase, db.Model):
    __tablename__ = "audit_logs"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column("user_id", db.Integer())
    subject_id = db.Column("subject_id", db.Integer())
    target_type = db.Column("target_type", db.String(100), nullable=False)
    target_id = db.Column("target_id", db.Integer())
    action = db.Column("action", db.Integer())
    state_before = db.Column("state_before", db.Text())
    state_after = db.Column("state_after", db.Text())
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def __init__(self, current_user_id, subject_id, target_type, target_id, action, state_before, state_after):
        self.user_id = current_user_id
        self.subject_id = subject_id
        self.target_type = target_type
        self.target_id = target_id
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
    return {attr.key: getattr(target, attr.key) for attr in mapper.column_attrs}


class AuditMixin(JsonSerializableBase):

    @staticmethod
    def create_audit(connection, subject_id, object_type, object_id, action, **kwargs):
        from server.auth.security import current_user_id

        if session and "user" in session and "id" in session["user"]:
            audit = AuditLog(
                current_user_id(),
                subject_id,
                object_type,
                object_id,
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

    @staticmethod
    def audit_insert(mapper, connection, target):
        state_after = target_state(mapper, target)
        subject_id = find_subject(mapper, target)
        target.create_audit(connection, subject_id, target.__tablename__, target.id, ACTION_CREATE,
                            state_after=dynamicExtendedJSONEncoder.encode(state_after))

    @staticmethod
    def audit_delete(mapper, connection, target):
        state_before = target_state(mapper, target)
        subject_id = find_subject(mapper, target)
        target.create_audit(connection, subject_id, target.__tablename__, target.id, ACTION_DELETE,
                            state_before=dynamicExtendedJSONEncoder.encode(state_before))

    @staticmethod
    def audit_update(mapper, connection, target):
        state_before = {}
        state_after = {}
        inspr = inspect(target)
        attrs = mapper.column_attrs
        for attr in attrs:
            hist = getattr(inspr.attrs, attr.key).history
            if hist.has_changes():
                state_before[attr.key] = get_history(target, attr.key)[2].pop()
                state_after[attr.key] = getattr(target, attr.key)
        if state_before and state_after:
            target.create_audit(connection, find_subject(mapper, target), target.__tablename__, target.id,
                                ACTION_UPDATE,
                                state_before=dynamicExtendedJSONEncoder.encode(state_before),
                                state_after=dynamicExtendedJSONEncoder.encode(state_after))


metadata = MetaData()
Base = declarative_base(cls=(AuditMixin,), metadata=metadata)
