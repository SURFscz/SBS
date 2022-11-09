"""add unique collaberation member constraint

Revision ID: 2b32251ea449
Revises: a56b5af966d8
Create Date: 2022-04-08 14:11:55.545750

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2b32251ea449'
down_revision = 'a56b5af966d8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        constraint_name="unique_members",
        table_name="collaboration_memberships",
        columns=["user_id", "collaboration_id"]
    )


def downgrade():
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "ALTER TABLE collaboration_memberships DROP INDEX unique_members,"
            "ADD INDEX (user_id), ADD INDEX (collaboration_id)"
        )
    )
