# -*- coding: future_fstrings -*-
"""drop not used design columns

Revision ID: e5eb9fde77dd
Revises: b6890f54fae1
Create Date: 2020-09-04 12:53:42.304422

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e5eb9fde77dd'
down_revision = 'b6890f54fae1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users DROP COLUMN ubi_key"))
    conn.execute(text("ALTER TABLE users DROP COLUMN tiqr_key"))
    conn.execute(text("ALTER TABLE users DROP COLUMN totp_key"))

    conn.execute(text("ALTER TABLE services DROP COLUMN status"))

    conn.execute(text("ALTER TABLE collaborations DROP COLUMN status"))
    conn.execute(text("ALTER TABLE collaborations DROP COLUMN access_type"))
    conn.execute(text("ALTER TABLE collaborations DROP COLUMN enrollment"))


def downgrade():
    pass
