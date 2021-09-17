"""Service toggle to allow all users

Revision ID: 2c5fddba8f50
Revises: 663ed6ebad79
Create Date: 2021-09-17 10:34:44.708660

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '2c5fddba8f50'
down_revision = '663ed6ebad79'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN non_member_users_access_allowed tinyint(1) default 0"))


def downgrade():
    pass
