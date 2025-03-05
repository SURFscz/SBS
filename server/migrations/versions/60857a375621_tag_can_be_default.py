"""Tag can be default

Revision ID: 60857a375621
Revises: 6d49d5a8f858
Create Date: 2025-03-03 14:48:05.128760

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '60857a375621'
down_revision = '6d49d5a8f858'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `tags` ADD COLUMN is_default TINYINT(1) DEFAULT 0"))


def downgrade():
    pass
