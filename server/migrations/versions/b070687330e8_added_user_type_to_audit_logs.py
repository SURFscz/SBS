"""Added user_type to audit_logs

Revision ID: b070687330e8
Revises: c66a3d65d328
Create Date: 2025-03-13 10:34:10.458592

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b070687330e8'
down_revision = 'c66a3d65d328'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN user_type VARCHAR(255)"))


def downgrade():
    pass
