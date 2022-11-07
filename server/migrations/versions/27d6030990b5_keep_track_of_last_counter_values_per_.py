"""Keep track of last counter values per service

Revision ID: 27d6030990b5
Revises: 3d3e21f7c351
Create Date: 2022-11-07 11:37:42.161277

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '27d6030990b5'
down_revision = '3d3e21f7c351'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("scim_service_counters",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("counter", sa.Integer, nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
