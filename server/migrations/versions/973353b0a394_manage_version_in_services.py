"""Manage version in services

Revision ID: 973353b0a394
Revises: 9d068149a5c8
Create Date: 2024-06-29 10:33:37.670217

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '973353b0a394'
down_revision = '9d068149a5c8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN export_external_version int"))


def downgrade():
    pass
