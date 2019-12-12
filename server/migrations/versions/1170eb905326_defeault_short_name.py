# -*- coding: future_fstrings -*-
"""defeault short name

Revision ID: 1170eb905326
Revises: 33682b915f2d
Create Date: 2019-07-07 09:33:17.856642

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '1170eb905326'
down_revision = '33682b915f2d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # No alembic equivalent for fulltext index
    conn.execute(text("UPDATE organisations SET short_name = name WHERE short_name IS NULL"))


def downgrade():
    pass
