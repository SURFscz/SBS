"""Initial database

Revision ID: a6d9a5b30e14
Revises:
Create Date: 2019-01-07 10:28:20.335581

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a6d9a5b30e14'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("uid", sa.String(length=512), nullable=False),
                    sa.Column("name", sa.String(length=255), nullable=True),
                    sa.Column("email", sa.String(length=255), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("organisations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=True),
                    sa.Column("tenant_identifier", sa.String(length=255), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("organisation_memberships",
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("collaborations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("identifier", sa.String(length=255), nullable=False),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("access_type", sa.String(length=255), nullable=True),
                    sa.Column("enrollment", sa.String(length=255), nullable=True),
                    sa.Column("accepted_user_policy", sa.String(length=255), nullable=True),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("collaboration_memberships",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("services",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("entity_id", sa.String(length=512), nullable=False),
                    sa.Column("name", sa.String(length=512), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("address", sa.Text(), nullable=True),
                    sa.Column("identity_type", sa.String(length=255), nullable=True),
                    sa.Column("uri", sa.String(length=255), nullable=True),
                    sa.Column("accepted_user_policy", sa.String(length=255), nullable=True),
                    sa.Column("contact_email", sa.String(length=255), nullable=True),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("services_collaborations",
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False,
                              primary_key=True),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False,
                              primary_key=True),
                    )

    op.create_table("user_service_profiles",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("collaboration_membership_id", sa.Integer(),
                              sa.ForeignKey("collaboration_memberships.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("name", sa.String(length=255), nullable=True),
                    sa.Column("ssh_key", sa.Text(), nullable=True),
                    sa.Column("email", sa.String(length=255), nullable=True),
                    sa.Column("address", sa.String(length=512), nullable=True),
                    sa.Column("role", sa.String(length=255), nullable=True),
                    sa.Column("identifier", sa.String(length=512), nullable=True),
                    sa.Column("telephone_number", sa.String(length=255), nullable=True),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("authorisation_groups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("uri", sa.String(length=255), nullable=True),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("services_authorisation_groups",
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False,
                              primary_key=True),
                    sa.Column("authorisation_group_id", sa.Integer(),
                              sa.ForeignKey("authorisation_groups.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )

    op.create_table("collaboration_memberships_authorisation_groups",
                    sa.Column("collaboration_membership_id", sa.Integer(),
                              sa.ForeignKey("collaboration_memberships.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("authorisation_group_id", sa.Integer(),
                              sa.ForeignKey("authorisation_groups.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )

    op.create_table("join_requests",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("reference", sa.Text(), nullable=True),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )

    op.create_table("invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hash", sa.String(length=512), nullable=False),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("invitee_email", sa.String(length=255), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("accepted", sa.Boolean(), nullable=True),
                    sa.Column("denied", sa.Boolean(), nullable=True),
                    sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("organisation_invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hash", sa.String(length=512), nullable=False),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("invitee_email", sa.String(length=255), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("accepted", sa.Boolean(), nullable=True),
                    sa.Column("denied", sa.Boolean(), nullable=True),
                    sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    )


def downgrade():
    op.drop_table("collaboration_memberships_authorisation_groups")
    op.drop_table("services_authorisation_groups")
    op.drop_table("services_collaborations")
    op.drop_table("organisation_memberships")
    op.drop_table("collaboration_memberships")
    op.drop_table("user_service_profiles")
    op.drop_table("authorisation_groups")
    op.drop_table("join_requests")
    op.drop_table("invitations")
    op.drop_table("collaborations")
    op.drop_table("services")
    op.drop_table("users")
    op.drop_table("organisations")
