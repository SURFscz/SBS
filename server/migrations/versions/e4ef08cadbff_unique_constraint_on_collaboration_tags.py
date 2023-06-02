"""Unique constraint on collaboration_tags

Revision ID: e4ef08cadbff
Revises: be8859ea3c56
Create Date: 2023-06-01 17:50:11.397300

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e4ef08cadbff'
down_revision = 'be8859ea3c56'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("delete t1 FROM collaboration_tags t1 JOIN collaboration_tags t2 "
                      "USING (collaboration_id, tag_id) WHERE t1.id > t2.id;"))
    conn.execute(text(
        "ALTER TABLE collaboration_tags ADD UNIQUE INDEX collaboration_tags_unique(collaboration_id, tag_id)"))


def downgrade():
    pass
