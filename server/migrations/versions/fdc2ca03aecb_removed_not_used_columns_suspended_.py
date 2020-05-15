"""Removed not used columns suspended notifications

Revision ID: fdc2ca03aecb
Revises: a9fba62c688b
Create Date: 2020-05-15 15:44:19.312433

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fdc2ca03aecb'
down_revision = 'a9fba62c688b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE suspend_notifications DROP COLUMN is_admin_initiated"))
    conn.execute(text("ALTER TABLE suspend_notifications DROP COLUMN hash"))


def downgrade():
    pass
