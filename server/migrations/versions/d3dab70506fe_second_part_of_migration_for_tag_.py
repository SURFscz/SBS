"""Second part of migration for tag_organisation

Revision ID: d3dab70506fe
Revises: abb8c82fc3dd
Create Date: 2024-04-25 12:53:36.161542

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd3dab70506fe'
down_revision = 'abb8c82fc3dd'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # Because of version 5 of mySQL in prod we have to use a for loop instead of inner select in update
    result = conn.execute(text("SELECT id from tags"))
    for row in result:
        pk = row[0]
        # Now get the organisation_id from the collaboration that uses this tag
        inner_results = conn.execute(text(f"SELECT c.organisation_id FROM collaborations c "
                                          f"INNER JOIN collaboration_tags ct on ct.collaboration_id = c.id "
                                          f"INNER JOIN tags t ON t.id = ct.tag_id "
                                          f"WHERE t.id = {pk} LIMIT 1"))
        # If there are no results, then the tag is not being used, and we delete orphan tags later in this migration
        for r in inner_results:
            organisation_id = r[0]
            conn.execute(text(f"UPDATE tags set organisation_id = {organisation_id}"))

    # Delete orphan tags
    conn.execute(text("DELETE FROM tags WHERE organisation_id IS NULL"))

    # Make the foreign_key not nullable, because of version 5 we can not do this in one go
    conn.execute(text("ALTER TABLE tags DROP FOREIGN KEY tags_ibfk_1"))
    conn.execute(text("ALTER TABLE tags MODIFY COLUMN organisation_id INT NOT NULL"))
    conn.execute(text("ALTER TABLE tags ADD CONSTRAINT tags_ibfk_1 "
                      "FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE"))

    # now add the unique index
    conn.execute(text("ALTER TABLE tags ADD UNIQUE INDEX tag_organisation_unique_tag(tag_value, organisation_id)"))


def downgrade():
    pass
