import os

from flask import current_app, session, g as request_context
from sqlalchemy import MetaData
from sqlalchemy import event, inspect
from sqlalchemy.orm import class_mapper
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.attributes import get_history

from server.db.datetime import TZDateTime
from server.db.db import db
from server.db.json_serialize_base import JsonSerializableBase

ACTION_CREATE = 1
ACTION_UPDATE = 2
ACTION_DELETE = 3

ignore_attributes = [
    "created_at",
    "created_by",
    "last_accessed_date",
    "last_activity_date",
    "last_login_date",
    "last_used_date",
    "logo",
    "pam_last_login_date",
    "sweep_scim_last_run",
    "updated_at",
    "updated_by",
    "uuid4"
]

relationship_configuration = {
    "groups": ["collaboration_memberships", "invitations"],
    "collaborations": ["services", "tags"],
    "organisations": ["services"],
    "services": ["allowed_organisations", "service_groups", "automatic_connection_allowed_organisations"]
}


class AuditLog(JsonSerializableBase, db.Model):
    __tablename__ = "audit_logs"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column("user_id", db.Integer())
    user_type = db.Column("user_type", db.String(length=255), nullable=True)
    subject_id = db.Column("subject_id", db.Integer())
    target_type = db.Column("target_type", db.String(length=100), nullable=False)
    target_id = db.Column("target_id", db.Integer())
    target_name = db.Column("target_name", db.String(length=255), nullable=True)
    parent_id = db.Column("parent_id", db.Integer())
    parent_name = db.Column("parent_name", db.String(length=100), nullable=True)
    action = db.Column("action", db.Integer())
    state_before = db.Column("state_before", db.Text())
    state_after = db.Column("state_after", db.Text())
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def __init__(self, current_user_id, user_type, subject_id, target_type, target_id, target_name, parent_id,
                 parent_name, action, state_before, state_after):
        self.user_id = current_user_id
        self.user_type = user_type
        self.subject_id = subject_id
        self.target_type = target_type
        self.target_id = target_id
        self.target_name = target_name
        self.parent_id = parent_id
        self.parent_name = parent_name
        self.action = action
        self.state_before = state_before
        self.state_after = state_after


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
    response = current_app.json.response(attributes)
    return response.data.decode()


parent_configuration = {
    "organisation_memberships": ("organisation_id", "organisations"),
    "collaboration_memberships": ("collaboration_id", "collaborations"),
    "groups": ("collaboration_id", "collaborations"),
    "collaborations": ("organisation_id", "organisations"),
    "join_requests": ("collaboration_id", "collaborations"),
    "invitations": ("collaboration_id", "collaborations"),
    "organisation_invitations": ("organisation_id", "organisations"),
    "service_invitations": ("service_id", "services"),
    "service_memberships": ("service_id", "services"),
    "api_keys": ("organisation_id", "organisations"),
    "schac_home_organisations": ("organisation_id", "organisations"),
    "collaboration_requests": ("organisation_id", "organisations"),
    "service_connection_requests": ("collaboration_id", "collaborations"),
    "service_groups": ("service_id", "services"),
    "service_tokens": ("service_id", "services"),
    "service_aups": ("service_id", "services")
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
            user_type = None
            if hasattr(target, "user_id"):
                user_id = getattr(target, "user_id")
            if not user_id:
                user_id = current_user_id() if session and "user" in session and "id" in session["user"] else None
            if not user_id and request_context.get("external_api_organisation_name"):
                user_type = request_context.get("external_api_organisation_name")
            if not user_id and not user_type:
                user_type = "System"
            audit = AuditLog(
                user_id,
                user_type,
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
            scoped_session = sessionmaker(db.engine)
            with scoped_session.begin() as sc:
                sc.merge(audit)
                sc.commit()

    @classmethod
    def __declare_last__(cls):
        if not hasattr(cls, "audit_log_exclude"):
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
        target.create_audit(None, subject_id, value, target.id, target.__tablename__, ACTION_CREATE,
                            state_after=state_after)

    @staticmethod
    def audit_relationship_remove(target, value, _):
        mapper = class_mapper(value.__class__)
        state_before = target_state(mapper, value)
        subject_id = find_subject(mapper, value)
        target.create_audit(None, subject_id, value, target.id, target.__tablename__, ACTION_DELETE,
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
        # connection, subject_id, target, parent_id, parent_name, action
        pi = parent_info(target)
        if state_before and state_after:
            before_response = current_app.json.response(state_before).data.decode("ascii", "ignore")
            after_response = current_app.json.response(state_after).data.decode("ascii", "ignore")
            target.create_audit(connection, find_subject(mapper, target), target, pi[0], pi[1], ACTION_UPDATE,
                                state_before=before_response,
                                state_after=after_response)


metadata = MetaData()
Base = declarative_base(cls=AuditMixin, metadata=metadata)
