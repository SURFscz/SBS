"""External ID for SCIM user protocol

Revision ID: 0f75cdae24a1
Revises: 70615b99bcb3
Create Date: 2022-11-03 13:23:32.666077

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0f75cdae24a1'
down_revision = '70615b99bcb3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `users` ADD COLUMN external_id VARCHAR(255)"))

    result = conn.execute(text("SELECT id FROM `users`"))
    for row in result:
        id = row[0]
        conn.execute(text(f"UPDATE `users` SET `external_id` = '{str(uuid.uuid4())}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `users` CHANGE external_id external_id VARCHAR(255) NOT NULL"))


def downgrade():
    pass
