"""Suspended flag user

Revision ID: 10245fbb45a5
Revises: cd0dc1c86bef
Create Date: 2020-05-14 14:00:13.346893

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '10245fbb45a5'
down_revision = 'cd0dc1c86bef'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN suspended tinyint(1) default 0"))


def downgrade():
    pass
