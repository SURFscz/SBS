"""Rejection reason for service requests

Revision ID: 105db70cc7a5
Revises: d3ec54bf4a0e
Create Date: 2023-08-28 11:50:53.305614

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '105db70cc7a5'
down_revision = 'd3ec54bf4a0e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN rejection_reason text"))


def downgrade():
    pass
