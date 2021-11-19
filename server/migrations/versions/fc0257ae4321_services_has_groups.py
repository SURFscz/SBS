"""Services has groups

Revision ID: fc0257ae4321
Revises: b131f94b231c
Create Date: 2021-10-29 12:49:30.706093

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fc0257ae4321'
down_revision = 'b131f94b231c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_groups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("short_name", sa.String(length=255), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("auto_provision_members", sa.Boolean(), nullable=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
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
