"""Add uud4 to logo entities

Revision ID: 5a6dadd1525a
Revises: 7f3f33ca6521
Create Date: 2021-06-23 12:16:50.155678

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '5a6dadd1525a'
down_revision = '7f3f33ca6521'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    for table in ["organisations", "services", "collaborations", "collaboration_requests"]:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN uuid4 varchar(255)"))
        result = conn.execute(text(f"SELECT id FROM {table}"))
        for row in result:
            conn.execute(text(f"UPDATE {table} set uuid4 = '{str(uuid.uuid4())}' where id = {row[0]}"))

        conn.execute(text(f"ALTER TABLE {table} MODIFY uuid4 varchar(255) NOT NULL"))
        conn.execute(text(f"ALTER TABLE {table} ADD UNIQUE INDEX {table}_uuid4(uuid4)"))


def downgrade():
    pass
