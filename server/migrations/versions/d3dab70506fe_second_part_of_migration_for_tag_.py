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
    conn.execute(text("UPDATE tags t set t.organisation_id = (select c.organisation_id from collaborations c "
                      "inner join collaboration_tags ct on ct.tag_id = t.id limit 1)"))
    # Delete orphan tags
    conn.execute(text("DELETE FROM tags WHERE organisation_id IS NULL"))

    # Make the foreign_key not nullable
    conn.execute(text("ALTER TABLE tags MODIFY COLUMN organisation_id INT NOT NULL"))

    # now add the unique index
    conn.execute(text("ALTER TABLE tags ADD UNIQUE INDEX tag_organisation_unique_tag(tag_value, organisation_id)"))


def downgrade():
    pass
