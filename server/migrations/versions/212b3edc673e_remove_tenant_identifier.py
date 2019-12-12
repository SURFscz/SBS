# -*- coding: future_fstrings -*-
"""remove tenant-identifier

Revision ID: 212b3edc673e
Revises: de8d064f5407
Create Date: 2019-09-12 11:42:07.492602

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '212b3edc673e'
down_revision = 'de8d064f5407'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations DROP tenant_identifier"))


def downgrade():
    pass
