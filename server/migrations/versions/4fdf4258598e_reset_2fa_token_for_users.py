"""Reset 2fa token for users

Revision ID: 4fdf4258598e
Revises: 5a6dadd1525a
Create Date: 2021-06-24 12:03:07.165676

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '4fdf4258598e'
down_revision = '5a6dadd1525a'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN mfa_reset_token varchar(512)"))


def downgrade():
    pass
