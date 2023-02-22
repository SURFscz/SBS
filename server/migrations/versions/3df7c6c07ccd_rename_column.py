"""Rename column

Revision ID: 3df7c6c07ccd
Revises: 93fcea9046a9
Create Date: 2023-02-22 14:15:21.107086

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3df7c6c07ccd'
down_revision = '93fcea9046a9'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services CHANGE white_listed allow_restricted_orgs tinyint(1)"))


def downgrade():
    pass
