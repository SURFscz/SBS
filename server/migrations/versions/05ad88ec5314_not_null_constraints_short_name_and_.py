"""not null constraints short_name and global_urn

Revision ID: 05ad88ec5314
Revises: f21abaeba7db
Create Date: 2020-06-20 08:36:46.083449

"""
import random
import re
import string

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '05ad88ec5314'
down_revision = 'f21abaeba7db'
branch_labels = None
depends_on = None


def random_string(string_length=14):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(string_length))


def cleanse_short_name(name):
    return re.sub(r"[^a-zA-Z_\-0-9]+", "", name)[:14]


def upgrade():
    conn = op.get_bind()

    # organisations name & short_name are not null constraints
    result = conn.execute(text("SELECT id FROM `organisations` WHERE `name` IS NULL"))
    for row in result:
        id = row[0]
        conn.execute(text(f"UPDATE `organisations` SET `name` = '{random_string()}' WHERE id = {id}"))

    result = conn.execute(text("SELECT id, `name` FROM `organisations` WHERE short_name IS NULL"))
    for row in result:
        id = row[0]
        name = row[1]
        conn.execute(text(f"UPDATE `organisations` SET short_name = '{cleanse_short_name(name)}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `organisations` CHANGE `name` `name` VARCHAR(255) NOT NULL"))
    conn.execute(text("ALTER TABLE `organisations` CHANGE short_name short_name VARCHAR(255) NOT NULL"))

    # collaborations short_name & global_urn are not null constraints
    result = conn.execute(text("SELECT id, name FROM `collaborations` WHERE short_name IS NULL"))
    for row in result:
        id = row[0]
        name = row[1]
        conn.execute(text(f"UPDATE `collaborations` SET short_name = '{cleanse_short_name(name)}' WHERE id = {id}"))

    result = conn.execute(
        text("SELECT coll.id AS id, coll.short_name AS coll_short_name, org.short_name AS org_short_name "
             "FROM "
             "collaborations coll INNER JOIN organisations org ON org.id = coll.organisation_id "
             "WHERE coll.global_urn IS NULL"))
    for row in result:
        id = row.id
        coll_short_name = row.coll_short_name
        org_short_name = row.org_short_name
        global_urn = f"{org_short_name}:{coll_short_name}"
        conn.execute(text(f"UPDATE `collaborations` SET global_urn = '{global_urn}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `collaborations` CHANGE `short_name` `short_name` VARCHAR(255) NOT NULL"))
    conn.execute(text("ALTER TABLE `collaborations` CHANGE global_urn global_urn TEXT NOT NULL"))

    # groups global_urn is not null constraint
    result = conn.execute(text("SELECT gr.id AS id, gr.short_name AS gr_short_name, coll.short_name AS coll_short_name,"
                               " org.short_name AS org_short_name "
                               "FROM "
                               "`groups` gr INNER JOIN collaborations coll ON coll.id = gr.collaboration_id "
                               "INNER JOIN organisations org ON org.id = coll.organisation_id "
                               "WHERE gr.global_urn IS NULL"))
    for row in result:
        id = row.id
        gr_short_name = row.gr_short_name
        coll_short_name = row.coll_short_name
        org_short_name = row.org_short_name
        global_urn = f"{org_short_name}:{coll_short_name}:{gr_short_name}"
        conn.execute(text(f"UPDATE `groups` SET global_urn = '{global_urn}' WHERE id = {id}"))

    conn.execute(text("ALTER TABLE `groups` CHANGE global_urn global_urn TEXT NOT NULL"))


def downgrade():
    pass
