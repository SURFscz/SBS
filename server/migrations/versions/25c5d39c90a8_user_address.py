# -*- coding: future_fstrings -*-
"""user address

Revision ID: 25c5d39c90a8
Revises: 70271bd22f66
Create Date: 2019-02-20 14:53:57.666833

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '25c5d39c90a8'
down_revision = '70271bd22f66'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN address VARCHAR(255)"))


def downgrade():
    pass
