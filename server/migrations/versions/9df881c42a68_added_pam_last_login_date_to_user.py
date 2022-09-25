"""Added pam_last_login_date to User

Revision ID: 9df881c42a68
Revises: b45376e1b61e
Create Date: 2022-08-24 12:08:49.263019

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9df881c42a68'
down_revision = 'b45376e1b61e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN pam_last_login_date datetime"))


def downgrade():
    pass
