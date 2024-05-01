"""Migrate collaboration tags with the wrong org_id

Revision ID: a8c68296935a
Revises: 38ca877e6e94
Create Date: 2024-04-30 16:07:06.998606

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a8c68296935a'
down_revision = '38ca877e6e94'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # Find all collaboration_tags that have the wrong tag.organisation_id
    result = conn.execute(text("SELECT ct.id, t.tag_value, c.organisation_id, t.organisation_id FROM collaborations c "
                               "INNER JOIN collaboration_tags ct on ct.collaboration_id = c.id "
                               "INNER JOIN tags t on t.id = ct.tag_id "
                               "WHERE c.organisation_id <> t.organisation_id "
                               "AND NOT EXISTS (SELECT t2.tag_value FROM tags t2 WHERE t2.tag_value = t.tag_value "
                               "AND t2.organisation_id = c.organisation_id )"))
    for row in result:
        # Create new tag with the same tag_value and the collaboration.organisation_id
        collaboration_tag_id = row[0]
        tag_value = row[1]
        organisation_id = row[2]
        conn.execute(text(f"INSERT INTO tags (tag_value, organisation_id) "
                          f"VALUES ({tag_value}, {organisation_id})"))
        result = conn.execute(text(f"SELECT id FROM tags "
                                   f"WHERE tag_value = '{tag_value}' AND organisation_id = {organisation_id}"))
        tag_id = next(result, (0,))[0]
        conn.execute(text(f"UPDATE collaboration_tags SET tag_id = {tag_id} WHERE id = {collaboration_tag_id}"))

    result = conn.execute(text("SELECT ct.id, t.id, t2.id, t.tag_value, c.organisation_id, t.organisation_id "
                               "FROM collaborations c INNER JOIN collaboration_tags ct ON ct.collaboration_id = c.id"
                               " INNER JOIN tags t on t.id = ct.tag_id inner join tags t2 on t.tag_value = t2.tag_value where c.organisation_id <> t.organisation_id and t2.organisation_id = c.organisation_id"))

    # Delete orphans
    # select t.id, t.tag_value from tags t where not exists (select ct.id from collaboration_tags ct where ct.tag_id = t.id);

def downgrade():
    pass
