"""Service connection requests rejection reason

Revision ID: bfff5ff0d8e6
Revises: fd61c7076492
Create Date: 2024-02-27 11:35:02.410585

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'bfff5ff0d8e6'
down_revision = 'fd61c7076492'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests ADD COLUMN rejection_reason text"))


def downgrade():
    pass
