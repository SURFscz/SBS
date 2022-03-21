"""User 2FA UUID for proxy authorization

Revision ID: a56b5af966d8
Revises: cd11385cdc16
Create Date: 2022-03-21 11:29:27.351257

"""
from alembic import op
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a56b5af966d8'
down_revision = 'cd11385cdc16'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN second_fa_uuid VARCHAR(255)"))


def downgrade():
    pass
