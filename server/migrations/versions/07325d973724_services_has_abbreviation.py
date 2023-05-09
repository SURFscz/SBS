"""Services has abbreviation

Revision ID: 07325d973724
Revises: fc0257ae4321
Create Date: 2021-10-29 13:37:44.642365

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.

revision = '07325d973724'
down_revision = 'fc0257ae4321'
branch_labels = None
depends_on = None


def cleanse_short_name(data):
    short_name = data["abbreviation"]
    while short_name[0].isnumeric():
        short_name = short_name[1:]

    data["abbreviation"] = re.sub(r"[^a-zA-Z_0-9]+", "", short_name).lower()[:16]


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN abbreviation VARCHAR(255)"))

    result = conn.execute(text("SELECT id, `name` FROM `services`"))
    for row in result:
        id = row[0]
        name = row[1]
        data = {"abbreviation": name}
        cleanse_short_name(data)
        abbreviation = data["abbreviation"]
        conn.execute(text(f"UPDATE `services` SET abbreviation = '{abbreviation}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE services CHANGE abbreviation abbreviation VARCHAR(255) NOT NULL"))


def downgrade():
    pass
