"""Unique constraint for abbreviation on service

Revision ID: 1d175e8e4c29
Revises: 2b32251ea449
Create Date: 2022-04-13 11:22:35.160048

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '1d175e8e4c29'
down_revision = '2b32251ea449'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD UNIQUE INDEX services_unique_abbreviation(abbreviation)"))


def downgrade():
    pass
