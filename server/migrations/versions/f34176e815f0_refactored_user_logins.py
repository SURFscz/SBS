"""Refactored user_logins

Revision ID: f34176e815f0
Revises: e3625908288c
Create Date: 2022-09-15 13:21:23.492961

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f34176e815f0'
down_revision = 'e3625908288c'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("user_logins")
    op.create_table("user_logins",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("login_type", sa.String(length=255), nullable=False),
                    sa.Column("succeeded", sa.Boolean(), nullable=False, default=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"),
                              nullable=True),
                    sa.Column("user_uid", sa.String(length=512), nullable=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="SET NULL"),
                              nullable=True),
                    sa.Column("service_entity_id", sa.String(length=512), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
