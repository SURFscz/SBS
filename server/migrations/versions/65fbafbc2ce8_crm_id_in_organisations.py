"""CRM ID in organisations

Revision ID: 65fbafbc2ce8
Revises: a8c68296935a
Create Date: 2024-05-19 14:03:12.660246

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '65fbafbc2ce8'
down_revision = 'a8c68296935a'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN crm_id VARCHAR(255)"))


def downgrade():
    pass
