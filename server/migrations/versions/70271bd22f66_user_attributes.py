# -*- coding: future_fstrings -*-
"""user attributes

Revision ID: 70271bd22f66
Revises: 6aa49d7cddd2
Create Date: 2019-02-20 14:34:48.365905

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '70271bd22f66'
down_revision = '6aa49d7cddd2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # No alembic equivalent for fulltext index
    conn.execute(text("ALTER TABLE users ADD COLUMN scoped_affiliation VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN entitlement VARCHAR(255)"))


def downgrade():
    pass
