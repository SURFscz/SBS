"""User IP networks

Revision ID: cd11385cdc16
Revises: 16aec2d2cfab
Create Date: 2022-01-20 11:38:53.300991

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'cd11385cdc16'
down_revision = '16aec2d2cfab'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_ip_networks",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("network_value", sa.Text(), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
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
