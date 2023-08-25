"""uuid4 for service_request

Revision ID: d3ec54bf4a0e
Revises: 61ac0c0a774d
Create Date: 2023-08-25 15:32:14.926636

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd3ec54bf4a0e'
down_revision = '61ac0c0a774d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    for table in ["service_requests"]:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN uuid4 varchar(255)"))
        result = conn.execute(text(f"SELECT id FROM {table}"))
        for row in result:
            conn.execute(text(f"UPDATE {table} set uuid4 = '{str(uuid.uuid4())}' where id = {row[0]}"))

        conn.execute(text(f"ALTER TABLE {table} MODIFY uuid4 varchar(255) NOT NULL"))
        conn.execute(text(f"ALTER TABLE {table} ADD UNIQUE INDEX {table}_uuid4(uuid4)"))


def downgrade():
    pass
