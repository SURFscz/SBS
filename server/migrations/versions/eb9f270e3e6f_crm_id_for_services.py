"""CRM-ID for services

Revision ID: eb9f270e3e6f
Revises: 973353b0a394
Create Date: 2024-07-16 11:31:44.079876

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'eb9f270e3e6f'
down_revision = '973353b0a394'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN crm_id VARCHAR(255)"))


def downgrade():
    pass
