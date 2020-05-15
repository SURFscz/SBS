"""Last login date and last accessed date

Revision ID: cd0dc1c86bef
Revises: 96beda7bf574
Create Date: 2020-05-14 09:19:37.738499

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'cd0dc1c86bef'
down_revision = '96beda7bf574'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN last_login_date datetime"))
    conn.execute(text("ALTER TABLE users ADD COLUMN last_accessed_date datetime"))


def downgrade():
    pass
