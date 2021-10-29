"""Services has abbreviation

Revision ID: 07325d973724
Revises: fc0257ae4321
Create Date: 2021-10-29 13:37:44.642365

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
from server.db.defaults import cleanse_short_name

revision = '07325d973724'
down_revision = 'fc0257ae4321'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN abbreviation VARCHAR(255)"))

    result = conn.execute("SELECT id, `name` FROM `services`")
    for row in result:
        id = row["id"]
        name = row["name"]
        data = {"abbreviation": name}
        cleanse_short_name(data, "abbreviation")
        abbreviation = data["abbreviation"]
        conn.execute(f"UPDATE `services` SET abbreviation = '{abbreviation}' WHERE id = {id}")

    conn.execute(text("ALTER TABLE services CHANGE abbreviation abbreviation VARCHAR(255) NOT NULL"))


def downgrade():
    pass
