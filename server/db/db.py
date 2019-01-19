import os

from flask_jsontools.formatting import JsonSerializableBase
from flask_migrate import command
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.ext.declarative import declarative_base

metadata = MetaData()
Base = declarative_base(cls=(JsonSerializableBase,), metadata=metadata)


class SQLAlchemyPrePing(SQLAlchemy):
    def apply_pool_defaults(self, app, options):
        options["pool_pre_ping"] = True
        options["echo"] = app.config["SQLALCHEMY_ECHO"]
        super().apply_pool_defaults(app, options)


db = SQLAlchemyPrePing()


def db_migrations(sqlalchemy_database_uri):
    migrations_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../migrations/")
    from alembic.config import Config
    config = Config(migrations_dir + "alembic.ini")
    config.set_main_option("sqlalchemy.url", sqlalchemy_database_uri)
    config.set_main_option("script_location", migrations_dir)
    command.upgrade(config, "head")


class User(Base, db.Model):
    __tablename__ = "users"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    uid = db.Column("uid", db.String(length=512), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=True)
    email = db.Column("email", db.String(length=255), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="user",
                                               cascade_backrefs=False, passive_deletes=True)
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="user",
                                                cascade_backrefs=False, passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="user",
                                    cascade_backrefs=False, passive_deletes=True)


class Organisation(Base, db.Model):
    __tablename__ = "organisations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    tenant_identifier = db.Column("tenant_identifier", db.String(length=512), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    collaborations = db.relationship("Collaboration", back_populates="organisation", cascade="all, delete-orphan",
                                     passive_deletes=True)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="organisation",
                                               cascade="all, delete-orphan", passive_deletes=True)
    organisation_invitations = db.relationship("OrganisationInvitation", back_populates="organisation",
                                               cascade="all, delete-orphan",
                                               passive_deletes=True)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.organisation_memberships))) > 0


class OrganisationMembership(Base, db.Model):
    __tablename__ = "organisation_memberships"
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), primary_key=True)
    user = db.relationship("User", back_populates="organisation_memberships")
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"), primary_key=True)
    organisation = db.relationship("Organisation", back_populates="organisation_memberships")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)


services_collaborations_association = db.Table(
    "services_collaborations",
    metadata,
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)

services_authorisation_groups_association = db.Table(
    "services_authorisation_groups",
    metadata,
    db.Column("authorisation_group_id", db.Integer(), db.ForeignKey("authorisation_groups.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)

collaboration_memberships_authorisation_groups_association = db.Table(
    "collaboration_memberships_authorisation_groups",
    metadata,
    db.Column("authorisation_group_id", db.Integer(), db.ForeignKey("authorisation_groups.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("collaboration_membership_id", db.Integer(),
              db.ForeignKey("collaboration_memberships.id", ondelete="CASCADE"), primary_key=True),
)


class CollaborationMembership(Base, db.Model):
    __tablename__ = "collaboration_memberships"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="collaboration_memberships")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="collaboration_memberships")
    user_service_profiles = db.relationship("UserServiceProfile", cascade="all, delete-orphan", passive_deletes=True,
                                            lazy="select")
    authorisation_groups = db.relationship("AuthorisationGroup",
                                           secondary=collaboration_memberships_authorisation_groups_association,
                                           back_populates="collaboration_memberships",
                                           lazy="select")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)


class UserServiceProfile(Base, db.Model):
    __tablename__ = "user_service_profiles"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service")
    collaboration_membership_id = db.Column(db.Integer(), db.ForeignKey("collaboration_memberships.id"))
    collaboration_membership = db.relationship("CollaborationMembership")
    name = db.Column("name", db.String(length=255), nullable=True)
    ssh_key = db.Column("ssh_key", db.Text(), nullable=True)
    email = db.Column("email", db.String(length=255), nullable=True)
    address = db.Column("address", db.String(length=255), nullable=True)
    role = db.Column("role", db.String(length=255), nullable=True)
    identifier = db.Column("identifier", db.String(length=255), nullable=True)
    telephone_number = db.Column("telephone_number", db.String(length=255), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class Service(Base, db.Model):
    __tablename__ = "services"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    entity_id = db.Column("entity_id", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    address = db.Column("address", db.Text(), nullable=True)
    identity_type = db.Column("identity_type", db.String(length=255), nullable=True)
    uri = db.Column("uri", db.String(length=255), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    contact_email = db.Column("contact_email", db.String(length=255), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=True)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=True)


class Collaboration(Base, db.Model):
    __tablename__ = "collaborations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    access_type = db.Column("access_type", db.String(length=255), nullable=True)
    enrollment = db.Column("enrollment", db.String(length=255), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaborations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    services = db.relationship("Service", secondary=services_collaborations_association, lazy="select")
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="collaboration",
                                                cascade="all, delete-orphan", passive_deletes=True)
    authorisation_groups = db.relationship("AuthorisationGroup", back_populates="collaboration",
                                           cascade="all, delete-orphan", passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="collaboration",
                                    cascade="all, delete-orphan", passive_deletes=True)
    invitations = db.relationship("Invitation", back_populates="collaboration", cascade="all, delete-orphan",
                                  passive_deletes=True)


class AuthorisationGroup(Base, db.Model):
    __tablename__ = "authorisation_groups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    uri = db.Column("uri", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="authorisation_groups")
    services = db.relationship("Service", secondary=services_authorisation_groups_association, lazy="select")
    collaboration_memberships = db.relationship("CollaborationMembership",
                                                secondary=collaboration_memberships_authorisation_groups_association,
                                                back_populates="authorisation_groups",
                                                lazy="select")


class JoinRequest(Base, db.Model):
    __tablename__ = "join_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    reference = db.Column("reference", db.Text(), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="join_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="join_requests")


class Invitation(Base, db.Model):
    __tablename__ = "invitations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    accepted = db.Column("accepted", db.Boolean(), nullable=True)
    denied = db.Column("denied", db.Boolean(), nullable=True)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)


class OrganisationInvitation(Base, db.Model):
    __tablename__ = "organisation_invitations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="organisation_invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    accepted = db.Column("accepted", db.Boolean(), nullable=True)
    denied = db.Column("denied", db.Boolean(), nullable=True)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
