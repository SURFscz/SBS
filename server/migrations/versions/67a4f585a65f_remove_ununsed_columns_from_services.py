"""Remove ununsed columns from Services

Revision ID: 67a4f585a65f
Revises: ba54557dbe47
Create Date: 2024-09-20 13:37:11.938673

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '67a4f585a65f'
down_revision = 'ba54557dbe47'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services DROP COLUMN identity_type"))
    conn.execute(text("ALTER TABLE services DROP COLUMN address"))


def downgrade():
    pass
