"""Add status to UserLogin

Revision ID: 12991f3c7bad
Revises: b9629b748a70
Create Date: 2022-10-21 14:08:46.229235

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '12991f3c7bad'
down_revision = 'b9629b748a70'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_logins ADD COLUMN status VARCHAR(255)"))


def downgrade():
    pass
