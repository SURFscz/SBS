"""Add continue_url to user_nonces

Revision ID: d59badfef8a0
Revises: 86aa25bc5279
Create Date: 2025-03-24 12:48:32.574798

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd59badfef8a0'
down_revision = '86aa25bc5279'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_nonces ADD COLUMN continue_url VARCHAR(512) DEFAULT NULL"))


def downgrade():
    pass
