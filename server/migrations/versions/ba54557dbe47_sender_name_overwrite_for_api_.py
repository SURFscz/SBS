"""Sender name overwrite for API invitations

Revision ID: ba54557dbe47
Revises: 952aef5395fa
Create Date: 2024-09-20 10:46:38.530130

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'ba54557dbe47'
down_revision = '952aef5395fa'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE invitations ADD COLUMN sender_name VARCHAR(255)"))


def downgrade():
    pass
