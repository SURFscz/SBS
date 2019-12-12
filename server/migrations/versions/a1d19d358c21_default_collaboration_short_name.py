# -*- coding: future_fstrings -*-
"""default collaboration short_name

Revision ID: a1d19d358c21
Revises: b0b2a82821dd
Create Date: 2019-07-09 14:34:07.833608

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a1d19d358c21'
down_revision = 'b0b2a82821dd'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE collaborations SET short_name = name WHERE short_name IS NULL"))


def downgrade():
    pass
