"""Add contacts to services

Revision ID: a6c5d21f17a0
Revises: ceb3c5f653b0
Create Date: 2021-12-06 09:58:25.519377

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a6c5d21f17a0'
down_revision = 'ceb3c5f653b0'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN support_email VARCHAR(255)"))
    conn.execute(text("ALTER TABLE services ADD COLUMN security_email VARCHAR(255)"))


def downgrade():
    pass
