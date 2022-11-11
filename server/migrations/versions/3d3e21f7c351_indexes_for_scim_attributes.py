"""Indexes for SCIM attributes

Revision ID: 3d3e21f7c351
Revises: 0f75cdae24a1
Create Date: 2022-11-05 15:22:37.944496

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3d3e21f7c351'
down_revision = '0f75cdae24a1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `collaborations` ADD UNIQUE INDEX collaborations_unique_identifier(identifier)"))
    conn.execute(text("ALTER TABLE `groups` ADD UNIQUE INDEX groups_unique_identifier(identifier)"))
    conn.execute(text("ALTER TABLE `users` ADD UNIQUE INDEX users_unique_external_id(external_id)"))


def downgrade():
    pass
