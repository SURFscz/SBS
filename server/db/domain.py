# -*- coding: future_fstrings -*-
import datetime
from uuid import uuid4

from flask import current_app
from sqlalchemy import select, func
from sqlalchemy.orm import column_property

from server.db.audit_mixin import Base, metadata
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE
from server.db.logo_mixin import LogoMixin


def gen_uuid4():
    return str(uuid4())


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
    home_organisation_uid = db.Column("home_organisation_uid", db.String(length=512), nullable=True)
    family_name = db.Column("family_name", db.String(length=255), nullable=True)
    given_name = db.Column("given_name", db.String(length=255), nullable=True)
    email = db.Column("email", db.String(length=255), nullable=True)
    second_factor_auth = db.Column("second_factor_auth", db.String(length=255), nullable=True)
    ssh_keys = db.relationship("SshKey", back_populates="user", cascade="all, delete-orphan", passive_deletes=True,
                               lazy="selectin")
    user_ip_networks = db.relationship("UserIpNetwork", cascade="all, delete-orphan", passive_deletes=True,
                                       lazy="selectin")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="user",
                                               cascade_backrefs=False, passive_deletes=True)
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="user",
                                                cascade_backrefs=False, passive_deletes=True)
    collaboration_requests = db.relationship("CollaborationRequest", back_populates="requester",
                                             cascade_backrefs=False, passive_deletes=True)
    service_memberships = db.relationship("ServiceMembership", back_populates="user",
                                          cascade_backrefs=False, passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="user", cascade_backrefs=False, passive_deletes=True)
    aups = db.relationship("Aup", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    service_aups = db.relationship("ServiceAup", back_populates="user", cascade="all, delete-orphan",
                                   passive_deletes=True)
    user_tokens = db.relationship("UserToken", back_populates="user", cascade="all, delete-orphan",
                                  passive_deletes=True)
    confirmed_super_user = db.Column("confirmed_super_user", db.Boolean(), nullable=True, default=False)
    eduperson_principal_name = db.Column("eduperson_principal_name", db.String(length=255), nullable=True)
    application_uid = db.Column("application_uid", db.String(length=255), nullable=True)
    last_accessed_date = db.Column("last_accessed_date", db.DateTime(timezone=True), nullable=False)
    last_login_date = db.Column("last_login_date", db.DateTime(timezone=True), nullable=False)
    suspended = db.Column("suspended", db.Boolean(), nullable=True, default=False)
    suspend_notifications = db.relationship("SuspendNotification", back_populates="user", cascade="all, delete-orphan",
                                            passive_deletes=True)
    mfa_reset_token = db.Column("mfa_reset_token", db.String(length=512), nullable=True)
    second_fa_uuid = db.Column("second_fa_uuid", db.String(length=512), nullable=True)
    ssid_required = db.Column("ssid_required", db.Boolean(), nullable=True, default=False)
    user_mails = db.relationship("UserMail", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def has_agreed_with_aup(self):
        return len([aup for aup in self.aups if aup.au_version == str(current_app.app_config.aup.version)]) > 0


services_organisations_association = db.Table(
    "services_organisations",
    metadata,
    db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True),
    db.Column("organisation_id", db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE")),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE")),
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

collaboration_tags_association = db.Table(
    "collaboration_tags",
    metadata,
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("tag_id", db.Integer(), db.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class CollaborationMembership(Base, db.Model):
    __tablename__ = "collaboration_memberships"
    __table_args__ = (
        db.UniqueConstraint('user_id', 'collaboration_id', name='unique_members'),
    )
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    status = db.Column("status", db.String(length=255), nullable=False, default=STATUS_ACTIVE)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
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

    def is_expired(self):
        return self.expiry_date and datetime.datetime.utcnow() > self.expiry_date


organisations_services_association = db.Table(
    "organisations_services",
    metadata,
    db.Column("organisation_id", db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


class Invitation(Base, db.Model):
    __tablename__ = "invitations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    status = db.Column("status", db.String(length=255), nullable=False)
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    groups = db.relationship("Group", secondary=groups_invitations_association, lazy="select",
                             back_populates="invitations")
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    external_identifier = db.Column("external_identifier", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    membership_expiry_date = db.Column("membership_expiry_date", db.DateTime(timezone=True), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    @staticmethod
    def validate_role(role):
        if role not in ["admin", "member"]:
            raise ValueError(f"{role} is not valid. Valid roles are admin and member")


services_collaborations_association = db.Table(
    "services_collaborations",
    metadata,
    db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True),
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE")),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE")),
)


class Tag(Base, db.Model):
    __tablename__ = "tags"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    tag_value = db.Column("tag_value", db.Text(), nullable=False)
    collaborations = db.relationship("Collaboration", secondary=collaboration_tags_association, lazy="select",
                                     back_populates="tags")


class Collaboration(Base, db.Model, LogoMixin):
    __tablename__ = "collaborations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    global_urn = db.Column("global_urn", db.Text, nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=False, default=STATUS_ACTIVE)
    last_activity_date = db.Column("last_activity_date", db.DateTime(timezone=True), nullable=False,
                                   server_default=db.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaborations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    services = db.relationship("Service", secondary=services_collaborations_association, lazy="select",
                               back_populates="collaborations")
    tags = db.relationship("Tag", secondary=collaboration_tags_association, lazy="select",
                           back_populates="collaborations")
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="collaboration",
                                                cascade="all, delete-orphan", passive_deletes=True)
    groups = db.relationship("Group", back_populates="collaboration",
                             cascade="all, delete-orphan", passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="collaboration",
                                    cascade="all, delete-orphan", passive_deletes=True)
    invitations = db.relationship("Invitation", back_populates="collaboration", cascade="all, delete-orphan",
                                  passive_deletes=True)
    service_connection_requests = db.relationship("ServiceConnectionRequest", back_populates="collaboration",
                                                  cascade="all, delete-orphan", passive_deletes=True)
    disable_join_requests = db.Column("disable_join_requests", db.Boolean(), nullable=True, default=False)
    disclose_member_information = db.Column("disclose_member_information", db.Boolean(), nullable=True, default=False)
    disclose_email_information = db.Column("disclose_email_information", db.Boolean(), nullable=True, default=False)
    website_url = db.Column("website_url", db.String(length=512), nullable=True)
    invitations_count = column_property(select([func.count(Invitation.id)])
                                        .where(Invitation.collaboration_id == id)
                                        .correlate_except(Invitation)
                                        .scalar_subquery())
    collaboration_memberships_count = column_property(select([func.count(CollaborationMembership.id)])
                                                      .where(CollaborationMembership.collaboration_id == id)
                                                      .correlate_except(CollaborationMembership)
                                                      .scalar_subquery())

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.collaboration_memberships))) > 0

    def is_admin(self, user_id):
        for membership in self.collaboration_memberships:
            if membership.user_id == user_id and membership.role == "admin":
                return True
        return False

    def service_emails(self):
        services = self.services + self.organisation.services
        res = {}
        for service in services:
            if service.contact_email:
                res[service.id] = [service.contact_email]
            else:
                res[service.id] = [membership.user.email for membership in service.service_memberships]
        return res


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


class Organisation(Base, db.Model, LogoMixin):
    __tablename__ = "organisations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    category = db.Column("category", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    on_boarding_msg = db.Column("on_boarding_msg", db.Text(), nullable=True)
    schac_home_organisations = db.relationship("SchacHomeOrganisation", cascade="all, delete-orphan",
                                               passive_deletes=True, lazy="selectin")
    services_restricted = db.Column("services_restricted", db.Boolean(), nullable=True, default=False)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    collaboration_creation_allowed = db.Column("collaboration_creation_allowed", db.Boolean(), nullable=True,
                                               default=False)
    collaborations = db.relationship("Collaboration", back_populates="organisation", cascade="all, delete-orphan",
                                     passive_deletes=True)
    services = db.relationship("Service", secondary=services_organisations_association, lazy="select",
                               back_populates="organisations")
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
    collaborations_count = column_property(select([func.count(Collaboration.id)])
                                           .where(Collaboration.organisation_id == id)
                                           .correlate_except(Collaboration)
                                           .scalar_subquery())
    organisation_memberships_count = column_property(select([func.count(OrganisationMembership.id)])
                                                     .where(OrganisationMembership.organisation_id == id)
                                                     .correlate_except(OrganisationMembership)
                                                     .scalar_subquery())

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.organisation_memberships))) > 0


class ServiceMembership(Base, db.Model):
    __tablename__ = "service_memberships"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), primary_key=True)
    user = db.relationship("User", back_populates="service_memberships")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"), primary_key=True)
    service = db.relationship("Service", back_populates="service_memberships")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class Service(Base, db.Model, LogoMixin):
    __tablename__ = "services"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    entity_id = db.Column("entity_id", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    address = db.Column("address", db.Text(), nullable=True)
    identity_type = db.Column("identity_type", db.String(length=255), nullable=True)
    abbreviation = db.Column("abbreviation", db.String(length=255), nullable=False)
    uri = db.Column("uri", db.String(length=255), nullable=True)
    privacy_policy = db.Column("privacy_policy", db.String(length=255), nullable=False)
    accepted_user_policy = db.Column("accepted_user_policy", db.Text(), nullable=True)
    ldap_password = db.Column("ldap_password", db.String(length=255), nullable=True)
    contact_email = db.Column("contact_email", db.String(length=255), nullable=True)
    support_email = db.Column("support_email", db.String(length=255), nullable=True)
    security_email = db.Column("security_email", db.String(length=255), nullable=True)
    public_visible = db.Column("public_visible", db.Boolean(), nullable=True, default=True)
    automatic_connection_allowed = db.Column("automatic_connection_allowed", db.Boolean(), nullable=True, default=True)
    access_allowed_for_all = db.Column("access_allowed_for_all", db.Boolean(), nullable=True, default=False)
    white_listed = db.Column("white_listed", db.Boolean(), nullable=True, default=False)
    non_member_users_access_allowed = db.Column("non_member_users_access_allowed", db.Boolean(), nullable=True,
                                                default=False)
    research_scholarship_compliant = db.Column("research_scholarship_compliant", db.Boolean(),
                                               nullable=True,
                                               default=False)
    code_of_conduct_compliant = db.Column("code_of_conduct_compliant", db.Boolean(), nullable=True, default=False)
    sirtfi_compliant = db.Column("sirtfi_compliant", db.Boolean(), nullable=True, default=False)
    token_enabled = db.Column("token_enabled", db.Boolean(), nullable=True, default=False)
    hashed_token = db.Column("hashed_token", db.String(length=255), nullable=True, default=None)
    token_validity_days = db.Column("token_validity_days", db.Integer(), nullable=True, default=0)
    pam_web_sso_enabled = db.Column("pam_web_sso_enabled", db.Boolean(), nullable=True, default=False)
    collaborations = db.relationship("Collaboration", secondary=services_collaborations_association, lazy="select",
                                     back_populates="services")
    allowed_organisations = db.relationship("Organisation", secondary=organisations_services_association, lazy="select")
    organisations = db.relationship("Organisation", secondary=services_organisations_association, lazy="select",
                                    back_populates="services")
    ip_networks = db.relationship("IpNetwork", cascade="all, delete-orphan", passive_deletes=True)
    service_connection_requests = db.relationship("ServiceConnectionRequest", back_populates="service",
                                                  cascade="all, delete-orphan", passive_deletes=True)
    service_groups = db.relationship("ServiceGroup", back_populates="service", cascade="all, delete-orphan",
                                     passive_deletes=True)
    service_memberships = db.relationship("ServiceMembership", back_populates="service",
                                          cascade="all, delete-orphan", passive_deletes=True)
    service_invitations = db.relationship("ServiceInvitation", back_populates="service",
                                          cascade="all, delete-orphan", passive_deletes=True)
    service_aups = db.relationship("ServiceAup", back_populates="service", cascade="all, delete-orphan",
                                   passive_deletes=True)
    user_tokens = db.relationship("UserToken", back_populates="service", cascade="all, delete-orphan",
                                  passive_deletes=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=True)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=True)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.service_memberships))) > 0


class ServiceInvitation(Base, db.Model):
    __tablename__ = "service_invitations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class Group(Base, db.Model):
    __tablename__ = "groups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
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
    invitations = db.relationship("Invitation", secondary=groups_invitations_association, lazy="select",
                                  back_populates="groups")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.collaboration_memberships))) > 0


class JoinRequest(Base, db.Model):
    __tablename__ = "join_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    reference = db.Column("reference", db.Text(), nullable=True)
    rejection_reason = db.Column("rejection_reason", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="join_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="join_requests")
    hash = db.Column("hash", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


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
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", db.DateTime(timezone=True), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    @staticmethod
    def validate_role(role):
        if role not in ["admin", "manager"]:
            raise ValueError(f"{role} is not valid. Valid roles are admin and manager")


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
    is_primary = db.Column("is_primary", db.Boolean(), nullable=True, default=False)


class CollaborationRequest(Base, db.Model, LogoMixin):
    __tablename__ = "collaboration_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    message = db.Column("message", db.Text(), nullable=True)
    rejection_reason = db.Column("rejection_reason", db.Text(), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaboration_requests")
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User", back_populates="collaboration_requests")
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    website_url = db.Column("website_url", db.String(length=512), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceConnectionRequest(Base, db.Model):
    __tablename__ = "service_connection_requests"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    is_member_request = db.Column("is_member_request", db.Boolean(), nullable=True, default=False)
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_connection_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="service_connection_requests")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class IpNetwork(Base, db.Model):
    __tablename__ = "ip_networks"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    network_value = db.Column("network_value", db.Text(), nullable=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class SchacHomeOrganisation(Base, db.Model):
    __tablename__ = "schac_home_organisations"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="schac_home_organisations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class SshKey(Base, db.Model):
    __tablename__ = "ssh_keys"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    ssh_value = db.Column("ssh_value", db.Text(), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="ssh_keys")
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class UserNameHistory(Base, db.Model):
    __tablename__ = "user_names_history"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    username = db.Column("username", db.String(length=255), nullable=True)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class UserMail(Base, db.Model):
    __tablename__ = "user_mails"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=True)
    recipient = db.Column("recipient", db.String(length=255), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="user_mails")
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceGroup(Base, db.Model):
    __tablename__ = "service_groups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    auto_provision_members = db.Column("auto_provision_members", db.Boolean(), nullable=True, default=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_groups")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceAup(Base, db.Model):
    __tablename__ = "service_aups"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    aup_url = db.Column("aup_url", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="service_aups")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_aups")
    agreed_at = db.Column("agreed_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                          nullable=False)


class UserToken(Base, db.Model):
    __tablename__ = "user_tokens"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    hashed_token = db.Column("hashed_token", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="user_tokens")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="user_tokens")
    last_used_date = db.Column("last_used_date", db.DateTime(timezone=True), nullable=True)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class UserIpNetwork(Base, db.Model):
    __tablename__ = "user_ip_networks"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    network_value = db.Column("network_value", db.Text(), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="user_ip_networks")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class PamSSOSession(Base, db.Model):
    __tablename__ = "pam_sso_sessions"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    session_id = db.Column("session_id", db.String(length=255), nullable=True)
    attribute = db.Column("attribute", db.String(length=255), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service")
    created_at = db.Column("created_at", db.DateTime(timezone=True), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
