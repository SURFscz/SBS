"""rename short_name

Revision ID: de8d064f5407
Revises: aa92c20313ea
Create Date: 2019-09-11 16:16:08.719233

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'de8d064f5407'
down_revision = 'aa92c20313ea'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users RENAME COLUMN short_name TO username;"))


def downgrade():
    pass
