# -*- coding: future_fstrings -*-
"""Unique service connection request hash

Revision ID: 739ab3bc2236
Revises: 8525aa160948
Create Date: 2019-12-10 11:14:14.445392

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '739ab3bc2236'
down_revision = '8525aa160948'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests ADD UNIQUE "
                      "INDEX service_connection_requests_unique_hash(hash)"))


def downgrade():
    pass
