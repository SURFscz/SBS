# -*- coding: future_fstrings -*-

from server.db.audit_mixin import Base, metadata
from server.db.db import db


class User(Base, db.Model):
    __tablename__ = "users"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    uid = db.Column("uid", db.String(length=512), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=True)
    username = db.Column("username", db.String(length=255), nullable=True)
    nick_name = db.Column("nick_name", db.String(length=255), nullable=True)
    edu_members = db.Column("edu_members", db.Text(), nullable=True)
    address = db.Column("address", db.String(length=255), nullable=True)
    affiliation = db.Column("affiliation", db.Text(), nullable=True)
    scoped_affiliation = db.Column("scoped_affiliation", db.Text(), nullable=True)
    entitlement = db.Column("entitlement", db.Text(), nullable=True)
    schac_home_organisation = db.Column("schac_home_organisation", db.String(length=255), nullable=True)
    family_name = db.Column("family_name", db.String(length=255), nullable=True)
    given_name = db.Column("given_name", db.String(length=255), nullable=True)
    email = db.Column("email", db.String(length=255), nullable=True)
    ssh_key = db.Column("ssh_key", db.Text(), nullable=True)
    ubi_key = db.Column("ubi_key", db.Text(), nullable=True)
    tiqr_key = db.Column("tiqr_key", db.Text(), nullable=True)
    totp_key = db.Column("totp_key", db.Text(), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="user",
                                               cascade_backrefs=False, passive_deletes=True)
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="user",
                                                cascade_backrefs=False, passive_deletes=True)
    collaboration_requests = db.relationship("CollaborationRequest", back_populates="requester",
                                             cascade_backrefs=False, passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="user", cascade_backrefs=False, passive_deletes=True)
    aups = db.relationship("Aup", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    confirmed_super_user = db.Column("confirmed_super_user", db.Boolean(), nullable=True, default=False)
    eduperson_principal_name = db.Column("eduperson_principal_name", db.String(length=255), nullable=True)
    application_uid = db.Column("application_uid", db.String(length=255), nullable=True)
    last_accessed_date = db.Column("last_accessed_date", db.DateTime(timezone=True), nullable=False)
    last_login_date = db.Column("last_login_date", db.DateTime(timezone=True), nullable=False)
    suspended = db.Column("suspended", db.Boolean(), nullable=True, default=False)
    suspend_notifications = db.relationship("SuspendNotification", back_populates="user", cascade="all, delete-orphan",
                                            passive_deletes=True)


class Organisation(Base, db.Model):
    __tablename__ = "organisations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    schac_home_organisation = db.Column("schac_home_organisation", db.String(length=255), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    collaboration_creation_allowed = db.Column("collaboration_creation_allowed", db.Boolean(), nullable=True,
                                               default=False)
    collaborations = db.relationship("Collaboration", back_populates="organisation", cascade="all, delete-orphan",
                                     passive_deletes=True)
    collaboration_requests = db.relationship("CollaborationRequest", back_populates="organisation",
                                             cascade="all, delete-orphan",
                                             passive_deletes=True)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="organisation",
                                               cascade="all, delete-orphan", passive_deletes=True)
    organisation_invitations = db.relationship("OrganisationInvitation", back_populates="organisation",
                                               cascade="all, delete-orphan",
                                               passive_deletes=True)
    api_keys = db.relationship("ApiKey", back_populates="organisation",
                               cascade="delete, delete-orphan",
                               passive_deletes=True)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.organisation_memberships))) > 0


class OrganisationMembership(Base, db.Model):
    __tablename__ = "organisation_memberships"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), primary_key=True)
    user = db.relationship("User", back_populates="organisation_memberships")
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"), primary_key=True)
    organisation = db.relationship("Organisation", back_populates="organisation_memberships")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


services_collaborations_association = db.Table(
    "services_collaborations",
    metadata,
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)

collaboration_memberships_groups_association = db.Table(
    "collaboration_memberships_groups",
    metadata,
    db.Column("group_id", db.Integer(), db.ForeignKey("groups.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("collaboration_membership_id", db.Integer(),
              db.ForeignKey("collaboration_memberships.id", ondelete="CASCADE"), primary_key=True),
)

groups_invitations_association = db.Table(
    "groups_invitations",
    metadata,
    db.Column("group_id", db.Integer(), db.ForeignKey("groups.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("invitation_id", db.Integer(), db.ForeignKey("invitations.id", ondelete="CASCADE"), primary_key=True),
)


class CollaborationMembership(Base, db.Model):
    __tablename__ = "collaboration_memberships"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="collaboration_memberships")
    invitation_id = db.Column(db.Integer(), db.ForeignKey("invitations.id"))
    invitation = db.relationship("Invitation")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="collaboration_memberships")
    groups = db.relationship("Group",
                             secondary=collaboration_memberships_groups_association,
                             back_populates="collaboration_memberships",
                             lazy="select")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


organisations_services_association = db.Table(
    "organisations_services",
    metadata,
    db.Column("organisation_id", db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


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
    public_visible = db.Column("public_visible", db.Boolean(), nullable=True, default=True)
    automatic_connection_allowed = db.Column("automatic_connection_allowed", db.Boolean(), nullable=True, default=True)
    white_listed = db.Column("white_listed", db.Boolean(), nullable=True, default=False)
    research_scholarship_compliant = db.Column("research_scholarship_compliant", db.Boolean(),
                                               nullable=True,
                                               default=False)
    code_of_conduct_compliant = db.Column("code_of_conduct_compliant", db.Boolean(), nullable=True, default=False)
    sirtfi_compliant = db.Column("sirtfi_compliant", db.Boolean(), nullable=True, default=False)
    status = db.Column("status", db.String(length=255), nullable=True)
    collaborations = db.relationship("Collaboration", secondary=services_collaborations_association, lazy="select")
    allowed_organisations = db.relationship("Organisation", secondary=organisations_services_association, lazy="select")
    created_by = db.Column("created_by", db.String(length=512), nullable=True)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=True)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class Collaboration(Base, db.Model):
    __tablename__ = "collaborations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    global_urn = db.Column("global_urn", db.Text, nullable=True)
    access_type = db.Column("access_type", db.String(length=255), nullable=True)
    enrollment = db.Column("enrollment", db.String(length=255), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaborations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    services = db.relationship("Service", secondary=services_collaborations_association, lazy="select")
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="collaboration",
                                                cascade="all, delete-orphan", passive_deletes=True)
    groups = db.relationship("Group", back_populates="collaboration",
                             cascade="all, delete-orphan", passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="collaboration",
                                    cascade="all, delete-orphan", passive_deletes=True)
    invitations = db.relationship("Invitation", back_populates="collaboration", cascade="all, delete-orphan",
                                  passive_deletes=True)
    disable_join_requests = db.Column("disable_join_requests", db.Boolean(), nullable=True, default=False)
    services_restricted = db.Column("services_restricted", db.Boolean(), nullable=True, default=False)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.collaboration_memberships))) > 0

    def is_admin(self, user_id):
        for membership in self.collaboration_memberships:
            if membership.user_id == user_id and membership.role == "admin":
                return True
        return False


class Group(Base, db.Model):
    __tablename__ = "groups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    global_urn = db.Column("global_urn", db.Text, nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    auto_provision_members = db.Column("auto_provision_members", db.Boolean(), nullable=True, default=False)
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="groups")
    collaboration_memberships = db.relationship("CollaborationMembership",
                                                secondary=collaboration_memberships_groups_association,
                                                back_populates="groups",
                                                lazy="select")
    invitations = db.relationship("Invitation", secondary=groups_invitations_association, lazy="select")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class JoinRequest(Base, db.Model):
    __tablename__ = "join_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    reference = db.Column("reference", db.Text(), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="join_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="join_requests")
    hash = db.Column("hash", db.String(length=512), nullable=False)


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
    groups = db.relationship("Group",
                             secondary=groups_invitations_association,
                             lazy="select")
    accepted = db.Column("accepted", db.Boolean(), nullable=True)
    denied = db.Column("denied", db.Boolean(), nullable=True)
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
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


class ApiKey(Base, db.Model):
    __tablename__ = "api_keys"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hashed_secret = db.Column("hashed_secret", db.String(length=512), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="api_keys")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class Aup(Base, db.Model):
    __tablename__ = "aups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    au_version = db.Column("au_version", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="aups")
    agreed_at = db.Column("agreed_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                          nullable=False)


class SuspendNotification(Base, db.Model):
    __tablename__ = "suspend_notifications"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="suspend_notifications")
    sent_at = db.Column("sent_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                        nullable=False)
    hash = db.Column("hash", db.String(length=255), nullable=False)
    is_primary = db.Column("is_primary", db.Boolean(), nullable=True, default=False)
    is_admin_initiated = db.Column("is_admin_initiated", db.Boolean(), nullable=True, default=False)


class CollaborationRequest(Base, db.Model):
    __tablename__ = "collaboration_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    message = db.Column("message", db.Text(), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaboration_requests")
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User", back_populates="collaboration_requests")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceConnectionRequest(Base, db.Model):
    __tablename__ = "service_connection_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
