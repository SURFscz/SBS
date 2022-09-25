"""uri_info for service

Revision ID: e3625908288c
Revises: 9df881c42a68
Create Date: 2022-09-05 15:24:19.711974

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'e3625908288c'
down_revision = '9df881c42a68'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN uri_info VARCHAR(255)"))


def downgrade():
    pass
