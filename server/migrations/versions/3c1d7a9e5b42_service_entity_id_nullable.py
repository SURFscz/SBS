"""Service entity_id nullable

Revision ID: 3c1d7a9e5b42
Revises: fdeb5f8ff280
Create Date: 2026-10-27 10:00:00.000000

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3c1d7a9e5b42'
down_revision = 'fdeb5f8ff280'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services MODIFY COLUMN entity_id VARCHAR(255) NULL"))


def downgrade():
    pass
