# -*- coding: future_fstrings -*-
"""short unique username for users

Revision ID: 7abfb528d0c1
Revises: d609f776d07b
Create Date: 2019-09-11 14:00:21.942818

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '7abfb528d0c1'
down_revision = 'd609f776d07b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN short_name varchar(255)"))
    conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX users_short_name(short_name)"))


def downgrade():
    pass
