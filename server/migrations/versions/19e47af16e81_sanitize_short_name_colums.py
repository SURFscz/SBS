"""Sanitize short_name colums

Revision ID: 19e47af16e81
Revises: 739ab3bc2236
Create Date: 2019-12-11 10:25:29.559851

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '19e47af16e81'
down_revision = '739ab3bc2236'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    tables = ["collaborations", "groups", "organisations", "collaboration_requests"]
    for table in tables:
        conn.execute(text(f"UPDATE `{table}` SET short_name = REGEXP_REPLACE(short_name, '[^a-zA-Z_0-9]+', '')"))


def downgrade():
    pass
