"""Added optional description to ssh_keys

Revision ID: fb7af1fce2e5
Revises: 37e79c5ba3ad
Create Date: 2023-02-08 09:44:38.623820

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fb7af1fce2e5'
down_revision = '37e79c5ba3ad'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE ssh_keys ADD COLUMN name VARCHAR(255)"))


def downgrade():
    pass
