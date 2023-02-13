"""Unique constraints on group names

Revision ID: f28b51b5dd3b
Revises: cebfbbddee5b
Create Date: 2023-02-13 10:46:45.237145

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f28b51b5dd3b'
down_revision = 'cebfbbddee5b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_groups ADD UNIQUE INDEX service_groups_unique_name(name, service_id)"))
    conn.execute(text("ALTER TABLE `groups` ADD UNIQUE INDEX groups_unique_name(name, collaboration_id)"))


def downgrade():
    pass
