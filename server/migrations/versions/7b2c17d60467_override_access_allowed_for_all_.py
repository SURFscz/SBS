"""override_access_allowed_for_all_connections

Revision ID: 7b2c17d60467
Revises: eb554f142ef6
Create Date: 2023-10-16 15:51:08.746321

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '7b2c17d60467'
down_revision = 'eb554f142ef6'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services DROP COLUMN public_visible"))
    conn.execute(text("ALTER TABLE services ADD COLUMN override_access_allowed_all_connections tinyint(1) default 0"))


def downgrade():
    pass
