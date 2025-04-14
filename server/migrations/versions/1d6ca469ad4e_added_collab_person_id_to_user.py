"""Added collab_person_id to User

Revision ID: 1d6ca469ad4e
Revises: 13e3d85c1c5b
Create Date: 2025-04-01 09:00:26.162974

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '1d6ca469ad4e'
down_revision = '13e3d85c1c5b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN collab_person_id VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX users_unique_collab_person_id(collab_person_id)"))


def downgrade():
    pass
