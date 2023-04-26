"""short_name required for collaboration_requests

Revision ID: 947d95b12b98
Revises: 05ad88ec5314
Create Date: 2020-08-13 09:44:19.267592

"""
import random
import string

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '947d95b12b98'
down_revision = '05ad88ec5314'
branch_labels = None
depends_on = None


def random_string(string_length=14):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(string_length))


def upgrade():
    conn = op.get_bind()

    # collaboration_requests short_name is not null constraint
    result = conn.execute(text("SELECT cr.id AS id, org.short_name AS org_short_name "
                          "FROM "
                          "collaboration_requests cr INNER JOIN organisations org ON org.id = cr.organisation_id "
                          "WHERE cr.short_name IS NULL"))
    for row in result:
        id = row.id
        org_short_name = row.org_short_name
        short_name = f"{org_short_name}:{random_string()}"
        conn.execute(text(f"UPDATE `collaboration_requests` SET short_name = '{short_name}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `collaboration_requests` CHANGE `short_name` `short_name` VARCHAR(255) NOT NULL"))


def downgrade():
    pass
