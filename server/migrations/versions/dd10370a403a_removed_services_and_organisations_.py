"""Removed services and organisations association

Revision ID: dd10370a403a
Revises: e19c3fd08074
Create Date: 2025-09-19 14:38:47.696268

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'dd10370a403a'
down_revision = 'e19c3fd08074'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("DROP TABLE services_organisations"))


def downgrade():
    pass
