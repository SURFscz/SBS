"""Remove second_fa_uuid from User

Revision ID: da18d412fb32
Revises: 153264045155
Create Date: 2024-10-07 14:23:10.654073

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'da18d412fb32'
down_revision = '153264045155'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users DROP COLUMN second_fa_uuid"))


def downgrade():
    pass
