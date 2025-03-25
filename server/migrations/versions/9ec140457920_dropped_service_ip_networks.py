"""Dropped Service ip_networks

Revision ID: 9ec140457920
Revises: b070687330e8
Create Date: 2025-03-19 13:58:55.112666

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '9ec140457920'
down_revision = 'b070687330e8'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("ip_networks")


def downgrade():
    pass
