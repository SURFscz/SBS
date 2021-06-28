"""Added recipient to user_mails

Revision ID: e8d5d16770ee
Revises: 3f51e9cb0e1c
Create Date: 2021-06-28 14:25:03.683994

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e8d5d16770ee'
down_revision = '3f51e9cb0e1c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_mails ADD COLUMN recipient MEDIUMTEXT"))


def downgrade():
    pass
