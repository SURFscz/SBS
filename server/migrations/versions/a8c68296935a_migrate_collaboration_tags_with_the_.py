"""Migrate collaboration tags with the wrong org_id

Revision ID: a8c68296935a
Revises: 38ca877e6e94
Create Date: 2024-04-30 16:07:06.998606

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a8c68296935a'
down_revision = '38ca877e6e94'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # Find all collaboration_tags that have the wrong tag.organisation_id and where there is no correct tag
    result = conn.execute(text("SELECT ct.id, t.tag_value, c.organisation_id FROM collaborations c "
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

    # Find all collaboration_tags that have the wrong tag.organisation_id and where there is a correct tag
    result = conn.execute(text("SELECT ct.id, t2.id "
                               "FROM collaborations c INNER JOIN collaboration_tags ct ON ct.collaboration_id = c.id "
                               "INNER JOIN tags t ON t.id = ct.tag_id "
                               "INNER JOIN tags t2 ON t.tag_value = t2.tag_value "
                               "WHERE c.organisation_id <> t.organisation_id AND t2.organisation_id = c.organisation_id"))
    for row in result:
        collaboration_tag_id = row[0]
        correct_tag_id = row[1]
        conn.execute(text(f"UPDATE collaboration_tags SET tag_id = {correct_tag_id} WHERE id = {collaboration_tag_id}"))

    # Delete orphans - e.g. tags that are not being used by any collaboration
    conn.execute(text("DELETE FROM tags WHERE id IN (SELECT * FROM "
                      "(SELECT t.id FROM tags t WHERE NOT EXISTS "
                      "(SELECT ct.id FROM collaboration_tags ct WHERE ct.tag_id = t.id))tblTmp)"))


def downgrade():
    pass
