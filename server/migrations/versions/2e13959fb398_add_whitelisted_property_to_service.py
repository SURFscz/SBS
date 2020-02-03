"""Add whitelisted property to Service

Revision ID: 2e13959fb398
Revises: 67f9a14018c2
Create Date: 2020-02-03 09:33:39.536756

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '2e13959fb398'
down_revision = '67f9a14018c2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN white_listed tinyint(1) default 0"))


def downgrade():
    pass
