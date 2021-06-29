"""Use name in user_mails

Revision ID: 4518237d5e60
Revises: 9b64d5e90d0d
Create Date: 2021-06-28 17:13:51.495344

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '4518237d5e60'
down_revision = '9b64d5e90d0d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_mails DROP COLUMN mail_type"))
    conn.execute(text("ALTER TABLE user_mails ADD COLUMN name VARCHAR(255) NOT NULL"))


def downgrade():
    pass
