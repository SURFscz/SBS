"""identifiers for groups and organisations

Revision ID: f21abaeba7db
Revises: fdc2ca03aecb
Create Date: 2020-06-20 07:07:40.704525

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f21abaeba7db'
down_revision = 'fdc2ca03aecb'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `organisations` ADD COLUMN identifier VARCHAR(255)"))
    conn.execute(text("ALTER TABLE `groups` ADD COLUMN identifier VARCHAR(255)"))

    for db_name in ["organisations", "groups"]:
        result = conn.execute(text(f"SELECT id FROM `{db_name}`"))
        for row in result:
            id = row[0]
            conn.execute(text(f"UPDATE `{db_name}` SET identifier = '{str(uuid.uuid4())}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `organisations` CHANGE identifier identifier VARCHAR(255) NOT NULL"))
    conn.execute(text("ALTER TABLE `groups` CHANGE identifier identifier VARCHAR(255) NOT NULL"))


def downgrade():
    pass
