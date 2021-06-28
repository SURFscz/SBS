"""Removed content from user_mails

Revision ID: 3f51e9cb0e1c
Revises: 0d4a2e58ba68
Create Date: 2021-06-28 14:07:55.855888

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '3f51e9cb0e1c'
down_revision = '0d4a2e58ba68'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_mails DROP COLUMN content"))


def downgrade():
    pass
