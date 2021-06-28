"""User is opttional in user_emails

Revision ID: 9b64d5e90d0d
Revises: e8d5d16770ee
Create Date: 2021-06-28 15:05:30.586724

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9b64d5e90d0d'
down_revision = 'e8d5d16770ee'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_mails MODIFY COLUMN user_id INT(11)"))


def downgrade():
    pass
