"""User can be marked rate-limited

Revision ID: 952aef5395fa
Revises: bbde154c31f8
Create Date: 2024-08-23 14:23:27.587558

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '952aef5395fa'
down_revision = 'bbde154c31f8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN rate_limited tinyint(1) default 0"))


def downgrade():
    pass
