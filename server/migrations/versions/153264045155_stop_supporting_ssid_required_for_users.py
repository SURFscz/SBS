"""Stop supporting ssid_required for Users

Revision ID: 153264045155
Revises: 1cf9014bb75a
Create Date: 2024-09-30 09:39:07.546681

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '153264045155'
down_revision = '1cf9014bb75a'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users DROP COLUMN ssid_required"))


def downgrade():
    pass
