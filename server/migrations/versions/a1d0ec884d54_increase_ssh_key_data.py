"""Increase SSH key data

Revision ID: a1d0ec884d54
Revises: d994ab2ce8a8
Create Date: 2021-02-05 13:05:05.503123

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a1d0ec884d54'
down_revision = 'd994ab2ce8a8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users MODIFY ssh_key MEDIUMTEXT"))


def downgrade():
    pass
