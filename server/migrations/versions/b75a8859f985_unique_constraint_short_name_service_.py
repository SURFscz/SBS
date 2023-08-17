"""Unique constraint short_name service_groups

Revision ID: b75a8859f985
Revises: 691694749e98
Create Date: 2023-08-17 11:15:54.095931

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b75a8859f985'
down_revision = '691694749e98'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `service_groups` ADD UNIQUE INDEX "
                      "service_groups_unique_short_name(short_name, service_id)"))


def downgrade():
    pass
