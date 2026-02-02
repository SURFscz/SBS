"""Add distributed_locks table

Revision ID: a1bd7ecbcc27
Revises: fdc2ca03aecb
Create Date: 2026-02-02 09:47:36.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a1bd7ecbcc27'
down_revision = 'fdc2ca03aecb'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("distributed_locks",
                    sa.Column("lock_name", sa.String(length=255), primary_key=True, nullable=False),
                    sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=False),
                    )


def downgrade():
    op.drop_table("distributed_locks")
