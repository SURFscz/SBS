"""Remove Provisioned by service from description

Revision ID: 527f14734c00
Revises: 8d674e53b5ba
Create Date: 2024-01-22 09:26:57.645360

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '527f14734c00'
down_revision = '8d674e53b5ba'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    provisioned = "Provisioned by service %"
    result = conn.execute(text(f"SELECT id, description from `groups` where description like '{provisioned}'"))
    for row in result:
        identifier = row[0]
        description = row[1]
        index = description.find("- ")
        if index > 0:
            new_description = description[index + 2:]
            conn.execute(text(f"UPDATE `groups` SET `description` = '{new_description}' WHERE id = {identifier}"))


def downgrade():
    pass
