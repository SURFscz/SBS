"""Initial database

Revision ID: a6d9a5b30e14
Revises:
Create Date: 2019-01-07 10:28:20.335581

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime
import pytz

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
                    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              onupdate=datetime.now(tz=pytz.utc), nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("organisations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=True),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              onupdate=datetime.now(tz=pytz.utc), nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("collaborations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=512), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("enrollment", sa.String(length=255), nullable=True),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              onupdate=datetime.now(tz=pytz.utc), nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("services",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=512), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("address", sa.Text(), nullable=True),
                    sa.Column("identity_type", sa.String(length=255), nullable=True),
                    sa.Column("uri", sa.String(length=255), nullable=True),
                    sa.Column("contact_email", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
                    sa.Column("status", sa.String(length=255), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              onupdate=datetime.now(tz=pytz.utc), nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )

    op.create_table("users_collaborations",
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id"), nullable=False),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    )

    op.create_table("services_collaborations",
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id"), nullable=False),
                    )

    op.create_table("users_organisations",
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    )

    op.create_table("join_requests",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hash", sa.String(length=512), nullable=False),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id"), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )

    op.create_table("invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hash", sa.String(length=512), nullable=False),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("user_email", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id"), nullable=False),
                    sa.Column("accepted", sa.Boolean(), nullable=True),
                    sa.Column("denied", sa.Boolean(), nullable=True),
                    sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    )


def downgrade():
    op.drop_table("users_collaborations")
    op.drop_table("services_collaborations")
    op.drop_table("users_organisations")
    op.drop_table("invitations")
    op.drop_table("join_requests")
    op.drop_table("services")
    op.drop_table("collaborations")
    op.drop_table("users")
    op.drop_table("organisations")
