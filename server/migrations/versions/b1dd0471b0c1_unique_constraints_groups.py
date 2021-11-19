"""Unique constraints groups

Revision ID: b1dd0471b0c1
Revises: 07325d973724
Create Date: 2021-11-02 18:54:53.963348

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b1dd0471b0c1'
down_revision = '07325d973724'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `groups` ADD UNIQUE INDEX group_short_name(`short_name`, `collaboration_id`)"))


def downgrade():
    pass
