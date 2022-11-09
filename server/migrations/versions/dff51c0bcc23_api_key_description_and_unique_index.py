"""api_key description and unique index

Revision ID: dff51c0bcc23
Revises: 37702ff78605
Create Date: 2019-06-15 13:35:53.513837

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'dff51c0bcc23'
down_revision = '37702ff78605'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE api_keys ADD UNIQUE INDEX users_unique_hashed_secret(hashed_secret)"))
    conn.execute(text("ALTER TABLE api_keys ADD COLUMN description text"))


def downgrade():
    pass
