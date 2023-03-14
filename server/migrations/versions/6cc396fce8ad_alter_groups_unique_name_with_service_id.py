"""Alter groups_unique_name with service_id

Revision ID: 6cc396fce8ad
Revises: 84c68dedd55d
Create Date: 2023-03-14 11:15:07.740123

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '6cc396fce8ad'
down_revision = '84c68dedd55d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `groups` DROP INDEX groups_unique_name"))
    conn.execute(text("ALTER TABLE `groups` "
                      "ADD UNIQUE INDEX groups_unique_name_service(name, collaboration_id, service_group_id)"))
    pass


def downgrade():
    pass
