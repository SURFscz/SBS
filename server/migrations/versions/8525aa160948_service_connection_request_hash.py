# -*- coding: future_fstrings -*-
"""Service Connection Request hash

Revision ID: 8525aa160948
Revises: 36e8ccaa2189
Create Date: 2019-12-10 10:47:11.862854

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '8525aa160948'
down_revision = '36e8ccaa2189'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests ADD COLUMN hash VARCHAR(512)"))


def downgrade():
    pass
