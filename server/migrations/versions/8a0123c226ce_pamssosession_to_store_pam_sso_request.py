"""PamSSOSession to store Pam sso request

Revision ID: 8a0123c226ce
Revises: 917bdd3b3aa1
Create Date: 2022-05-05 14:39:14.540401

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '8a0123c226ce'
down_revision = '917bdd3b3aa1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("pam_sso_sessions",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("session_id", sa.String(length=255), nullable=False),
                    sa.Column("attribute", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
