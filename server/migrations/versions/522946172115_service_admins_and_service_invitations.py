"""Service admins and service invitations

Revision ID: 522946172115
Revises: 20c1def702bc
Create Date: 2021-12-02 14:21:13.392707

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '522946172115'
down_revision = '20c1def702bc'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hash", sa.String(length=255), nullable=False),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("invitee_email", sa.String(length=255), nullable=False),
                    sa.Column("intended_role", sa.String(length=255), nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("accepted", sa.Boolean(), nullable=True),
                    sa.Column("denied", sa.Boolean(), nullable=True),
                    sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    )

    op.create_table("service_memberships",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )


def downgrade():
    pass
