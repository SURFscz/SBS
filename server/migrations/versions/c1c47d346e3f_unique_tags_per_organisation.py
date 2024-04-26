"""Unique tags per organisation

Revision ID: c1c47d346e3f
Revises: b133d5e0e198
Create Date: 2024-04-24 15:00:20.418700

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'c1c47d346e3f'
down_revision = 'b133d5e0e198'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # get all duplicated tags
    duplicate_tags = []
    result = conn.execute(text("SELECT tag_value, GROUP_CONCAT(id) FROM tags GROUP BY tag_value HAVING count(id) > 1"))
    for row in result:
        duplicate_tags.append({"tag_value": row[0], "identifiers": [int(pk) for pk in row[1].split(",")]})
    for tags in duplicate_tags:
        # first update all collaboration_tags used in duplicates to use the first one and then delete the others
        first_tag_id = tags["identifiers"][0]
        other_tags_id = tags["identifiers"][1:]
        # can't do mass update, as we might encounter Duplicate entry, which we can ignore because delete on cascade
        for pk in other_tags_id:
            try:
                conn.execute(text(f"UPDATE collaboration_tags SET tag_id = {first_tag_id} WHERE tag_id = {pk}"))
            except Exception:
                pass
            conn.execute(text(f"DELETE from tags WHERE id = {pk}"))

    # we have to convert the tag_value from TEXT to VARCHAR, otherwise we can't include it in a unique key
    conn.execute(text("ALTER TABLE tags CHANGE tag_value tag_value VARCHAR(255) NOT NULL"))

    # now add the organisation_id to the tags table
    conn.execute(text("ALTER TABLE tags ADD COLUMN organisation_id INT NULL"))


def downgrade():
    pass
