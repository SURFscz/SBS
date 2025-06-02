"""ACS-locations in Service

Revision ID: 3d84733af2f1
Revises: 5099c8ca2268
Create Date: 2025-06-02 12:58:50.771376

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3d84733af2f1'
down_revision = '5099c8ca2268'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `services` ADD COLUMN acs_locations TEXT DEFAULT NULL"))


def downgrade():
    pass
