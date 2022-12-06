"""Rename is_primary for user suspend_notifications

Revision ID: f3c6a6d477f7
Revises: 0aafb26a14a7
Create Date: 2022-12-05 15:46:44.459451

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f3c6a6d477f7'
down_revision = '0aafb26a14a7'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE suspend_notifications CHANGE COLUMN is_primary is_suspension tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE suspend_notifications ADD COLUMN is_warning tinyint(1) default 0"))
    conn.execute(text("UPDATE suspend_notifications SET is_warning = 1"))


def downgrade():
    pass
