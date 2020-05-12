"""confirmed super user

Revision ID: ce633d58f432
Revises: 00dbc8488a06
Create Date: 2020-05-12 15:06:42.134276

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'ce633d58f432'
down_revision = '00dbc8488a06'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN confirmed_super_user tinyint(1) default 0"))


def downgrade():
    pass
