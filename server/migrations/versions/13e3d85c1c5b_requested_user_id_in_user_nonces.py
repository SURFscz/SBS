"""requested_user_id in user_nonces

Revision ID: 13e3d85c1c5b
Revises: 86aa25bc5279
Create Date: 2025-03-27 10:09:14.656575

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '13e3d85c1c5b'
down_revision = '86aa25bc5279'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_nonces ADD COLUMN requested_user_id VARCHAR(512) DEFAULT NULL"))


def downgrade():
    pass
