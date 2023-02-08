"""Add service group FK to groups

Revision ID: c212aeb59073
Revises: fb7af1fce2e5
Create Date: 2023-02-08 14:20:48.069661

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'c212aeb59073'
down_revision = 'fb7af1fce2e5'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `groups` ADD COLUMN `service_group_id` INT NULL, "
                      "ADD FOREIGN KEY `groups_ibfk_2`(`service_group_id`) "
                      "REFERENCES `service_groups`(`id`) ON DELETE CASCADE"))


def downgrade():
    pass
