"""Category for organisation

Revision ID: e5d4b81b40e2
Revises: f8653b0d35ee
Create Date: 2020-10-30 14:17:55.820236

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e5d4b81b40e2'
down_revision = 'f8653b0d35ee'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN category VARCHAR(255)"))


def downgrade():
    pass
