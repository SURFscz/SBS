"""Tag has Organisation Units

Revision ID: 6d49d5a8f858
Revises: e3c5852cb374
Create Date: 2025-03-03 13:56:01.114462

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '6d49d5a8f858'
down_revision = 'e3c5852cb374'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("tag_units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("tag_id", sa.Integer(),
                              sa.ForeignKey("tags.id", ondelete="cascade"), nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )


def downgrade():
    pass
