"""Rejection reason for join requests

Revision ID: 918d182679bb
Revises: a1d0ec884d54
Create Date: 2021-02-05 15:35:32.498077

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '918d182679bb'
down_revision = 'a1d0ec884d54'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE join_requests ADD COLUMN rejection_reason text"))


def downgrade():
    pass
