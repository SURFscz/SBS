from uuid import uuid4

from flask import current_app
from sqlalchemy import select, func, and_
from sqlalchemy.orm import column_property

from server import tools
from server.db.audit_mixin import Base, metadata
from server.db.datetime import TZDateTime
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, STATUS_OPEN, STATUS_SUSPENDED
from server.db.logo_mixin import LogoMixin
from server.db.secret_mixin import SecretMixin
from server.tools import dt_now


def gen_uuid4():
    return str(uuid4())


class User(Base, db.Model):
    __tablename__ = "users"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    uid = db.Column("uid", db.String(length=512), nullable=False)
    external_id = db.Column("external_id", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=True)
    collab_person_id = db.Column("collab_person_id", db.String(length=255), nullable=True)
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
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    updated_at = db.Column("updated_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    organisation_memberships = db.relationship("OrganisationMembership", back_populates="user",
                                               cascade="all, delete, delete-orphan", passive_deletes=True)
    collaboration_memberships = db.relationship("CollaborationMembership", back_populates="user",
                                                cascade="all, delete, delete-orphan", passive_deletes=True)
    collaboration_requests = db.relationship("CollaborationRequest", back_populates="requester",
                                             cascade="all, delete, delete-orphan", passive_deletes=True)
    service_requests = db.relationship("ServiceRequest", back_populates="requester",
                                       cascade="all, delete, delete-orphan", passive_deletes=True)
    service_memberships = db.relationship("ServiceMembership", back_populates="user",
                                          cascade="all, delete, delete-orphan", passive_deletes=True)
    join_requests = db.relationship("JoinRequest", back_populates="user",
                                    cascade="all, delete, delete-orphan", passive_deletes=True)
    service_connection_requests = db.relationship("ServiceConnectionRequest", back_populates="requester",
                                                  cascade="all, delete-orphan", passive_deletes=True)
    aups = db.relationship("Aup", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    service_aups = db.relationship("ServiceAup", back_populates="user", cascade="all, delete-orphan",
                                   passive_deletes=True)
    organisation_aups = db.relationship("OrganisationAup", back_populates="user", cascade="all, delete-orphan",
                                        passive_deletes=True)
    user_tokens = db.relationship("UserToken", back_populates="user", cascade="all, delete-orphan",
                                  passive_deletes=True)
    eduperson_principal_name = db.Column("eduperson_principal_name", db.String(length=255), nullable=True)
    application_uid = db.Column("application_uid", db.String(length=255), nullable=True)
    last_accessed_date = db.Column("last_accessed_date", TZDateTime(), nullable=False)
    last_login_date = db.Column("last_login_date", TZDateTime(), nullable=False)
    pam_last_login_date = db.Column("pam_last_login_date", TZDateTime(), nullable=False)
    suspended = db.Column("suspended", db.Boolean(), nullable=True, default=False)
    suspend_notifications = db.relationship("SuspendNotification", back_populates="user", cascade="all, delete-orphan",
                                            passive_deletes=True)
    mfa_reset_token = db.Column("mfa_reset_token", db.String(length=512), nullable=True)
    rate_limited = db.Column("rate_limited", db.Boolean(), nullable=True, default=False)
    user_mails = db.relationship("UserMail", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def has_agreed_with_aup(self):
        return len([aup for aup in self.aups if aup.au_version == str(current_app.app_config.aup.version)]) > 0

    def allowed_attr_view(self, organisation_identifiers, include_details):
        result = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "username": self.username,
            "uid": self.uid,
            "created_at": self.created_at,
            "schac_home_organisation": self.schac_home_organisation,
            "affiliation": self.affiliation,
            "scoped_affiliation": self.scoped_affiliation,
            "eduperson_principal_name": self.eduperson_principal_name,
            "mfa_reset_token": self.mfa_reset_token,
            "collaboration_memberships": [cm.allowed_attr_view() for cm in
                                          self.collaboration_memberships if
                                          cm.collaboration.organisation_id in organisation_identifiers]
        }
        if include_details:
            result["organisation_memberships"] = [om.allowed_attr_view() for om in
                                                  self.organisation_memberships if
                                                  om.organisation_id in organisation_identifiers]
        return result

    def successful_login(self, second_factor_confirmed=True):
        if second_factor_confirmed:
            now = tools.dt_now()

            self.last_accessed_date = now
            self.last_login_date = now

        self.suspended = False
        self.suspend_notifications = []

    @staticmethod
    def sanitize_user(user_json: dict):
        return {"name": user_json.get("name"), "email": user_json.get("email")}

    @staticmethod
    def translate_user_mfa_attributes(user_json: dict):
        if "mfa_reset_token" in user_json:
            del user_json["mfa_reset_token"]
        if "second_factor_auth" in user_json:
            user_json["second_factor_auth"] = bool(user_json["second_factor_auth"])
        return user_json


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

units_organisation_invitations_association = db.Table(
    "units_organisation_invitations",
    metadata,
    db.Column("organisation_invitation_id", db.Integer(),
              db.ForeignKey("organisation_invitations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE"), primary_key=True),
)

collaboration_tags_association = db.Table(
    "collaboration_tags",
    metadata,
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("tag_id", db.Integer(), db.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

collaboration_units_association = db.Table(
    "collaboration_units",
    metadata,
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE"), primary_key=True),
)

api_key_units_association = db.Table(
    "api_key_units",
    metadata,
    db.Column("api_key_id", db.Integer(), db.ForeignKey("api_keys.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE"), primary_key=True),
)

tag_units_association = db.Table(
    "tag_units",
    metadata,
    db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True),
    db.Column("tag_id", db.Integer(), db.ForeignKey("tags.id", ondelete="CASCADE")),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE")),
)

organisation_membership_units_association = db.Table(
    "organisation_membership_units",
    metadata,
    db.Column("organisation_membership_id", db.Integer(),
              db.ForeignKey("organisation_memberships.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE"), primary_key=True),
)

collaboration_requests_units_association = db.Table(
    "collaboration_requests_units",
    metadata,
    db.Column("collaboration_request_id", db.Integer(), db.ForeignKey("collaboration_requests.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("unit_id", db.Integer(), db.ForeignKey("units.id", ondelete="CASCADE"), primary_key=True),
)


class CollaborationMembership(Base, db.Model):
    __tablename__ = "collaboration_memberships"
    __table_args__ = (
        db.UniqueConstraint("user_id", "collaboration_id", name="unique_members"),
    )
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    status = db.Column("status", db.String(length=255), nullable=False, default=STATUS_ACTIVE)
    expiry_date = db.Column("expiry_date", TZDateTime(), nullable=True)
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
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def is_expired(self):
        return self.expiry_date and dt_now() > self.expiry_date

    def is_active(self):
        now = dt_now()
        not_expired = not self.expiry_date or self.expiry_date > now
        co_not_expired = not self.collaboration.expiry_date or self.collaboration.expiry_date > now
        co_suspended = self.collaboration.status == STATUS_SUSPENDED
        return not_expired and co_not_expired and not self.user.suspended and not co_suspended

    def allowed_attr_view(self):
        return {
            "role": self.role,
            "collaboration": {
                "id": self.collaboration.id,
                "name": self.collaboration.name
            }
        }


organisations_services_association = db.Table(
    "organisations_services",
    metadata,
    db.Column("organisation_id", db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)

automatic_connection_allowed_organisations_services_association = db.Table(
    "automatic_connection_allowed_organisations_services",
    metadata,
    db.Column("organisation_id", db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


class Invitation(Base, db.Model):
    __tablename__ = "invitations"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    status = db.Column("status", db.String(length=255), nullable=False)
    sender_name = db.Column("sender_name", db.String(length=255), nullable=True)
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    groups = db.relationship("Group", secondary=groups_invitations_association, lazy="select",
                             back_populates="invitations")
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    external_identifier = db.Column("external_identifier", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", TZDateTime(), nullable=True)
    membership_expiry_date = db.Column("membership_expiry_date", TZDateTime(), nullable=True)
    reminder_send = db.Column("reminder_send", db.Boolean(), nullable=True, default=False)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    @staticmethod
    def validate_role(role):
        if role not in ["admin", "member"]:
            raise ValueError(f"{role} is not valid. Valid roles are admin and member")

    def is_expired(self):
        return self.expiry_date and dt_now() > self.expiry_date


services_collaborations_association = db.Table(
    "services_collaborations",
    metadata,
    db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True),
    db.Column("collaboration_id", db.Integer(), db.ForeignKey("collaborations.id", ondelete="CASCADE")),
    db.Column("service_id", db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE")),
)


class Tag(Base, db.Model):
    __tablename__ = "tags"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    tag_value = db.Column("tag_value", db.String(length=255), nullable=False)
    is_default = db.Column("is_default", db.Boolean(), nullable=True, default=False)
    collaborations = db.relationship("Collaboration", secondary=collaboration_tags_association, lazy="select",
                                     back_populates="tags")
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="tags")
    units = db.relationship("Unit", secondary=tag_units_association, back_populates="tags", lazy="selectin")

    audit_log_exclude = True


class Collaboration(Base, db.Model, LogoMixin):
    __tablename__ = "collaborations"
    metadata = metadata
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
    last_activity_date = db.Column("last_activity_date", TZDateTime(), nullable=False,
                                   server_default=db.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
    expiry_date = db.Column("expiry_date", TZDateTime(), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="collaborations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_at = db.Column("updated_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    services = db.relationship("Service", secondary=services_collaborations_association, lazy="select",
                               back_populates="collaborations")
    tags = db.relationship("Tag", secondary=collaboration_tags_association, lazy="select",
                           back_populates="collaborations")
    units = db.relationship("Unit", secondary=collaboration_units_association, lazy="selectin",
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
    support_email = db.Column("support_email", db.String(length=255), nullable=True)
    invitations_count = column_property(select(func.count(Invitation.id))
                                        .where(Invitation.collaboration_id == id)
                                        .correlate_except(Invitation)
                                        .scalar_subquery())
    collaboration_memberships_count = column_property(select(func.count(CollaborationMembership.id))
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

    def admin_emails(self):
        return [m.user.email for m in self.collaboration_memberships if m.role == "admin"]

    def service_emails(self):
        services = self.services
        res = {}
        for service in services:
            if service.contact_email:
                res[service.id] = [service.contact_email]
            else:
                res[service.id] = [m.user.email for m in service.service_memberships if m.role == "admin"]
        return res

    def is_allowed_unit_organisation_membership(self, organisation_membership):
        if not organisation_membership.units:
            return True
        units = self.units if self.units else []
        return bool([unit for unit in units if unit in organisation_membership.units])


class OrganisationMembership(Base, db.Model):
    __tablename__ = "organisation_memberships"
    __table_args__ = (
        db.UniqueConstraint("user_id", "organisation_id", name="unique_members"),
    )
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), primary_key=True)
    user = db.relationship("User", back_populates="organisation_memberships")
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"), primary_key=True)
    organisation = db.relationship("Organisation", back_populates="organisation_memberships")
    units = db.relationship("Unit", secondary=organisation_membership_units_association, lazy="selectin",
                            back_populates="organisation_memberships")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def allowed_attr_view(self):
        return {
            "role": self.role,
            "organisation": {
                "id": self.organisation.id,
                "name": self.organisation.name
            }
        }


class Unit(Base, db.Model):
    __tablename__ = "units"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="units")
    collaborations = db.relationship("Collaboration", secondary=collaboration_units_association, lazy="select",
                                     back_populates="units")
    organisation_invitations = db.relationship("OrganisationInvitation",
                                               secondary=units_organisation_invitations_association, lazy="select",
                                               back_populates="units")
    organisation_memberships = db.relationship("OrganisationMembership",
                                               secondary=organisation_membership_units_association, lazy="select",
                                               back_populates="units")
    collaboration_requests = db.relationship("CollaborationRequest",
                                             secondary=collaboration_requests_units_association, lazy="select",
                                             back_populates="units")
    api_keys = db.relationship("ApiKey", secondary=api_key_units_association, lazy="select", back_populates="units")
    tags = db.relationship("Tag", secondary=tag_units_association, lazy="select", back_populates="units")

    audit_log_exclude = True


class Organisation(Base, db.Model, LogoMixin):
    __tablename__ = "organisations"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    identifier = db.Column("identifier", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    category = db.Column("category", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    on_boarding_msg = db.Column("on_boarding_msg", db.Text(), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.Text(), nullable=True)
    schac_home_organisations = db.relationship("SchacHomeOrganisation", cascade="all, delete-orphan",
                                               passive_deletes=True, lazy="selectin")
    units = db.relationship("Unit", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")
    services_restricted = db.Column("services_restricted", db.Boolean(), nullable=True, default=False)
    service_connection_requires_approval = db.Column("service_connection_requires_approval", db.Boolean(),
                                                     nullable=True, default=False)
    crm_id = db.Column("crm_id", db.String(length=255), nullable=True)
    invitation_sender_name = db.Column("invitation_sender_name", db.String(length=255), nullable=True)
    invitation_message = db.Column("invitation_message", db.Text(), nullable=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
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
    api_keys = db.relationship("ApiKey", back_populates="organisation", cascade="delete, delete-orphan",
                               passive_deletes=True)
    tags = db.relationship("Tag", back_populates="organisation", cascade="all, delete-orphan", passive_deletes=True)
    organisation_aups = db.relationship("OrganisationAup", back_populates="organisation", cascade="all, delete-orphan",
                                        passive_deletes=True)
    collaborations_count = column_property(select(func.count(Collaboration.id))
                                           .where(Collaboration.organisation_id == id)
                                           .correlate_except(Collaboration)
                                           .scalar_subquery())
    organisation_memberships_count = column_property(select(func.count(OrganisationMembership.id))
                                                     .where(OrganisationMembership.organisation_id == id)
                                                     .correlate_except(OrganisationMembership)
                                                     .scalar_subquery())

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.organisation_memberships))) > 0

    def admin_emails(self):
        return [membership.user.email for membership in self.organisation_memberships]


class ServiceMembership(Base, db.Model):
    __tablename__ = "service_memberships"
    __table_args__ = (
        db.UniqueConstraint("user_id", "service_id", name="unique_members"),
    )
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    role = db.Column("role", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), primary_key=True)
    user = db.relationship("User", back_populates="service_memberships")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"), primary_key=True)
    service = db.relationship("Service", back_populates="service_memberships")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceToken(Base, db.Model, SecretMixin):
    __tablename__ = "service_tokens"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hashed_token = db.Column("hashed_token", db.String(length=512), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    token_type = db.Column("token_type", db.String(length=255), nullable=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_tokens")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class Service(Base, db.Model, LogoMixin, SecretMixin):
    __tablename__ = "services"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    entity_id = db.Column("entity_id", db.String(length=255), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    abbreviation = db.Column("abbreviation", db.String(length=255), nullable=False)
    uri = db.Column("uri", db.String(length=255), nullable=True)
    uri_info = db.Column("uri_info", db.String(length=255), nullable=True)
    privacy_policy = db.Column("privacy_policy", db.String(length=255), nullable=True)
    accepted_user_policy = db.Column("accepted_user_policy", db.Text(), nullable=True)
    ldap_password = db.Column("ldap_password", db.String(length=255), nullable=True)
    ldap_identifier = db.Column("ldap_identifier", db.String(length=255), nullable=False, default=gen_uuid4)
    contact_email = db.Column("contact_email", db.String(length=255), nullable=True)
    support_email = db.Column("support_email", db.String(length=255), nullable=True)
    support_email_unauthorized_users = db.Column("support_email_unauthorized_users", db.Boolean(), nullable=True,
                                                 default=False)
    security_email = db.Column("security_email", db.String(length=255), nullable=True)
    override_access_allowed_all_connections = db.Column("override_access_allowed_all_connections", db.Boolean(),
                                                        nullable=True, default=False)
    automatic_connection_allowed = db.Column("automatic_connection_allowed", db.Boolean(), nullable=True, default=False)
    access_allowed_for_all = db.Column("access_allowed_for_all", db.Boolean(), nullable=True, default=False)
    allow_restricted_orgs = db.Column("allow_restricted_orgs", db.Boolean(), nullable=True, default=False)
    non_member_users_access_allowed = db.Column("non_member_users_access_allowed", db.Boolean(), nullable=True,
                                                default=False)
    connection_setting = db.Column("connection_setting", db.String(length=255), nullable=True)
    token_enabled = db.Column("token_enabled", db.Boolean(), nullable=True, default=False)
    token_validity_days = db.Column("token_validity_days", db.Integer(), nullable=True, default=0)
    pam_web_sso_enabled = db.Column("pam_web_sso_enabled", db.Boolean(), nullable=True, default=False)
    collaborations = db.relationship("Collaboration", secondary=services_collaborations_association, lazy="select",
                                     back_populates="services")
    allowed_organisations = db.relationship("Organisation", secondary=organisations_services_association, lazy="select")
    automatic_connection_allowed_organisations = \
        db.relationship("Organisation",
                        secondary=automatic_connection_allowed_organisations_services_association,
                        lazy="select")
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
    service_tokens = db.relationship("ServiceToken", back_populates="service",
                                     cascade="delete, delete-orphan",
                                     passive_deletes=True)
    ldap_enabled = db.Column("ldap_enabled", db.Boolean(), nullable=True, default=False)
    scim_enabled = db.Column("scim_enabled", db.Boolean(), nullable=True, default=False)
    scim_client_enabled = db.Column("scim_client_enabled", db.Boolean(), nullable=True, default=False)
    scim_url = db.Column("scim_url", db.String(length=255), nullable=True)
    scim_bearer_token = db.Column("scim_bearer_token", db.Text(), nullable=True)
    sweep_scim_enabled = db.Column("sweep_scim_enabled", db.Boolean(), nullable=True, default=False)
    sweep_remove_orphans = db.Column("sweep_remove_orphans", db.Boolean(), nullable=True, default=False)
    sweep_scim_daily_rate = db.Column("sweep_scim_daily_rate", db.Integer(), nullable=True, default=0)
    sweep_scim_last_run = db.Column("sweep_scim_last_run", TZDateTime(), nullable=True)
    redirect_urls = db.Column("redirect_urls", db.Text(), nullable=True)
    acs_locations = db.Column("acs_locations", db.Text(), nullable=True)
    oidc_client_secret = db.Column("oidc_client_secret", db.String(length=255), nullable=True)
    providing_organisation = db.Column("providing_organisation", db.String(length=255), nullable=True)
    grants = db.Column("grants", db.Text(), nullable=True)
    is_public_client = db.Column("is_public_client", db.Boolean(), nullable=True, default=False)
    saml_enabled = db.Column("saml_enabled", db.Boolean(), nullable=True, default=False)
    oidc_enabled = db.Column("oidc_enabled", db.Boolean(), nullable=True, default=False)
    exported_at = db.Column("exported_at", TZDateTime(), nullable=True)
    export_successful = db.Column("export_successful", db.Boolean(), nullable=True, default=False)
    export_external_identifier = db.Column("export_external_identifier", db.String(length=255), nullable=True)
    export_external_version = db.Column("export_external_version", db.Integer(), nullable=True)
    crm_organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"), nullable=True)
    crm_organisation = db.relationship("Organisation")
    access_allowed_for_crm_organisation = db.Column("access_allowed_for_crm_organisation", db.Boolean(), nullable=True,
                                                    default=False)
    created_by = db.Column("created_by", db.String(length=512), nullable=True)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=True)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    organisation_name = column_property(select(Organisation.name)
                                        .where(and_(crm_organisation_id != None,  # noqa: E711
                                                    Organisation.id == crm_organisation_id))
                                        .correlate_except(Organisation)
                                        .scalar_subquery())

    def access_allowed_by_crm_organisation(self, user: User):
        schac = user.schac_home_organisation
        if not schac or not self.crm_organisation_id or not self.access_allowed_for_crm_organisation:
            return False
        schac_homes = SchacHomeOrganisation.query \
            .filter(SchacHomeOrganisation.organisation_id == self.crm_organisation_id) \
            .all()
        hits = [sho for sho in schac_homes if sho.name == schac or schac.endswith(f".{sho.name}")]
        return bool(hits)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.service_memberships))) > 0

    def scim_bearer_token_db_value(self):
        # The SecretMixin and LogoMixin prevent use from accessing the scim_bearer_token directly
        return object.__getattribute__(self, "scim_bearer_token")

    def oidc_client_secret_db_value(self):
        # The SecretMixin and LogoMixin prevent use from accessing the oidc_client_secret directly
        return object.__getattribute__(self, "oidc_client_secret")


class ServiceRequest(Base, db.Model, LogoMixin):
    __tablename__ = "service_requests"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    abbreviation = db.Column("abbreviation", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    logo = db.Column("logo", db.Text(), nullable=True)
    uuid4 = db.Column("uuid4", db.String(length=255), nullable=False, default=gen_uuid4)
    providing_organisation = db.Column("providing_organisation", db.String(length=255), nullable=False)
    uri = db.Column("uri", db.String(length=255), nullable=True)
    uri_info = db.Column("uri_info", db.String(length=255), nullable=True)
    contact_email = db.Column("contact_email", db.String(length=255), nullable=True)
    support_email = db.Column("support_email", db.String(length=255), nullable=True)
    security_email = db.Column("security_email", db.String(length=255), nullable=True)
    privacy_policy = db.Column("privacy_policy", db.String(length=255), nullable=False)
    accepted_user_policy = db.Column("accepted_user_policy", db.String(length=255), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=False)
    comments = db.Column("comments", db.Text(), nullable=True)
    connection_type = db.Column("connection_type", db.String(length=255), nullable=True)
    redirect_urls = db.Column("redirect_urls", db.Text(), nullable=True)
    grants = db.Column("grants", db.Text(), nullable=True)
    is_public_client = db.Column("is_public_client", db.Boolean(), nullable=True, default=False)
    oidc_client_secret = db.Column("oidc_client_secret", db.String(length=255), nullable=True)
    entity_id = db.Column("entity_id", db.String(length=255), nullable=True)
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User", back_populates="service_requests")
    rejection_reason = db.Column("rejection_reason", db.Text(), nullable=True)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def oidc_client_secret_db_value(self):
        # The SecretMixin and LogoMixin prevent use from accessing the scim_bearer_token directly
        return object.__getattribute__(self, "oidc_client_secret")


class ServiceInvitation(Base, db.Model):
    __tablename__ = "service_invitations"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", TZDateTime(), nullable=True)
    reminder_send = db.Column("reminder_send", db.Boolean(), nullable=True, default=False)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class Group(Base, db.Model):
    __tablename__ = "groups"
    metadata = metadata
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
    service_group_id = db.Column(db.Integer(), db.ForeignKey("service_groups.id"), nullable=True)
    service_group = db.relationship("ServiceGroup", back_populates="groups")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_at = db.Column("updated_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    def is_member(self, user_id):
        return len(list(filter(lambda membership: membership.user_id == user_id, self.collaboration_memberships))) > 0


class JoinRequest(Base, db.Model):
    __tablename__ = "join_requests"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    rejection_reason = db.Column("rejection_reason", db.Text(), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="join_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="join_requests")
    hash = db.Column("hash", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class OrganisationInvitation(Base, db.Model):
    __tablename__ = "organisation_invitations"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    message = db.Column("message", db.Text(), nullable=True)
    invitee_email = db.Column("invitee_email", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="organisation_invitations")
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    units = db.relationship("Unit", secondary=units_organisation_invitations_association, lazy="select",
                            back_populates="organisation_invitations")
    intended_role = db.Column("intended_role", db.String(length=255), nullable=True)
    expiry_date = db.Column("expiry_date", TZDateTime(), nullable=True)
    reminder_send = db.Column("reminder_send", db.Boolean(), nullable=True, default=False)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    @staticmethod
    def validate_role(role):
        if role not in ["admin", "manager"]:
            raise ValueError(f"{role} is not valid. Valid roles are admin and manager")


class ApiKey(Base, db.Model, SecretMixin):
    __tablename__ = "api_keys"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    hashed_secret = db.Column("hashed_secret", db.String(length=512), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="api_keys")
    units = db.relationship("Unit", secondary=api_key_units_association, back_populates="api_keys", lazy="selectin")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)


class Aup(Base, db.Model):
    __tablename__ = "aups"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    au_version = db.Column("au_version", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="aups")
    agreed_at = db.Column("agreed_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                          nullable=False)


class SuspendNotification(Base, db.Model):
    __tablename__ = "suspend_notifications"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="suspend_notifications")
    sent_at = db.Column("sent_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                        nullable=False)
    is_suspension = db.Column("is_suspension", db.Boolean(), nullable=True, default=False)
    is_warning = db.Column("is_warning", db.Boolean(), nullable=True, default=False)


class CollaborationRequest(Base, db.Model, LogoMixin):
    __tablename__ = "collaboration_requests"
    metadata = metadata
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
    units = db.relationship("Unit", secondary=collaboration_requests_units_association, lazy="selectin",
                            back_populates="collaboration_requests")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceConnectionRequest(Base, db.Model):
    __tablename__ = "service_connection_requests"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    message = db.Column("message", db.Text(), nullable=True)
    hash = db.Column("hash", db.String(length=512), nullable=False)
    requester_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    requester = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    pending_organisation_approval = db.Column("pending_organisation_approval", db.Boolean(), nullable=True,
                                              default=False)
    status = db.Column("status", db.String(length=255), nullable=False, default=STATUS_OPEN)
    rejection_reason = db.Column("rejection_reason", db.Text(), nullable=True)
    service = db.relationship("Service", back_populates="service_connection_requests")
    collaboration_id = db.Column(db.Integer(), db.ForeignKey("collaborations.id"))
    collaboration = db.relationship("Collaboration", back_populates="service_connection_requests")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class SchacHomeOrganisation(Base, db.Model):
    __tablename__ = "schac_home_organisations"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id"))
    organisation = db.relationship("Organisation", back_populates="schac_home_organisations")
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)

    @staticmethod
    def organisations_by_user_schac_home(user: User):
        schac = user.schac_home_organisation
        if not schac:
            return []
        schac_homes = SchacHomeOrganisation.query.all()
        hits = [sho for sho in schac_homes if sho.name == schac or schac.endswith(f".{sho.name}")]
        return [sho.organisation for sho in hits]


class SshKey(Base, db.Model):
    __tablename__ = "ssh_keys"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    ssh_value = db.Column("ssh_value", db.Text(), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="ssh_keys")
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class UserNameHistory(Base, db.Model):
    __tablename__ = "user_names_history"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    username = db.Column("username", db.String(length=255), nullable=True)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class UserMail(Base, db.Model):
    __tablename__ = "user_mails"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=True)
    recipient = db.Column("recipient", db.String(length=255), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="user_mails")
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)
    audit_log_exclude = True


class ServiceGroup(Base, db.Model):
    __tablename__ = "service_groups"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    short_name = db.Column("short_name", db.String(length=255), nullable=True)
    description = db.Column("description", db.Text(), nullable=True)
    auto_provision_members = db.Column("auto_provision_members", db.Boolean(), nullable=True, default=False)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_groups")
    groups = db.relationship("Group", back_populates="service_group", cascade="all",
                             passive_deletes=True)
    created_by = db.Column("created_by", db.String(length=512), nullable=False)
    updated_by = db.Column("updated_by", db.String(length=512), nullable=False)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class ServiceAup(Base, db.Model):
    __tablename__ = "service_aups"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    aup_url = db.Column("aup_url", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="service_aups")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="service_aups")
    agreed_at = db.Column("agreed_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                          nullable=False)


class UserToken(Base, db.Model, SecretMixin):
    __tablename__ = "user_tokens"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    name = db.Column("name", db.String(length=255), nullable=False)
    description = db.Column("description", db.Text(), nullable=True)
    hashed_token = db.Column("hashed_token", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="user_tokens")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service", back_populates="user_tokens")
    last_used_date = db.Column("last_used_date", TZDateTime(), nullable=True)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class PamSSOSession(Base, db.Model):
    __tablename__ = "pam_sso_sessions"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    session_id = db.Column("session_id", db.String(length=255), nullable=True)
    attribute = db.Column("attribute", db.String(length=255), nullable=True)
    pin = db.Column("pin", db.String(length=255), nullable=True)
    pin_shown = db.Column("pin_shown", db.Boolean(), nullable=False, default=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"), nullable=True)
    user = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id"))
    service = db.relationship("Service")
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    audit_log_exclude = True


class UserLogin(Base, db.Model):
    __tablename__ = "user_logins"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    login_type = db.Column("login_type", db.String(length=255), nullable=False)
    succeeded = db.Column("succeeded", db.Boolean(), nullable=False, default=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user = db.relationship("User")
    user_uid = db.Column("user_uid", db.String(length=512), nullable=True)
    status = db.Column("status", db.String(length=255), nullable=True)
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    service = db.relationship("Service")
    service_entity_id = db.Column("service_entity_id", db.String(length=512), nullable=True)
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)

    audit_log_exclude = True


class OrganisationAup(Base, db.Model):
    __tablename__ = "organisation_aups"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    aup_url = db.Column("aup_url", db.String(length=255), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User", back_populates="organisation_aups")
    organisation_id = db.Column(db.Integer(), db.ForeignKey("organisations.id", ondelete="CASCADE"))
    organisation = db.relationship("Organisation", back_populates="organisation_aups")
    agreed_at = db.Column("agreed_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                          nullable=False)


class UserNonce(Base, db.Model):
    __tablename__ = "user_nonces"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    nonce = db.Column("nonce", db.String(length=255), nullable=False)
    error_status = db.Column("error_status", db.Integer(), nullable=False)
    issuer_id = db.Column("issuer_id", db.String(length=255), nullable=True)
    requested_service_entity_id = db.Column("requested_service_entity_id", db.String(length=255), nullable=True)
    requested_user_id = db.Column("requested_user_id", db.String(length=512), nullable=True)
    continue_url = db.Column("continue_url", db.String(length=512), nullable=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = db.relationship("User")
    service_id = db.Column(db.Integer(), db.ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    service = db.relationship("Service")
    created_at = db.Column("created_at", TZDateTime(), server_default=db.text("CURRENT_TIMESTAMP"),
                           nullable=False)


class RateLimitInfo(Base, db.Model):
    __tablename__ = "rate_limits_infos"
    metadata = metadata
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    user_id = db.Column(db.Integer(), db.ForeignKey("users.id"))
    user = db.relationship("User")
    last_accessed_date = db.Column("last_accessed_date", TZDateTime(), nullable=False)
    count = db.Column("count", db.Integer(), nullable=False)
