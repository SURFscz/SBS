"""Rate limit migration from Redis to mySql

Revision ID: 46fd9d8d4716
Revises: 11ab72ac894c
Create Date: 2025-06-27 12:35:25.288854

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '46fd9d8d4716'
down_revision = '11ab72ac894c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("rate_limits_infos",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False,
                              autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id",
                                                                     ondelete="cascade"), nullable=False),
                    sa.Column("last_accessed_date", sa.DateTime(timezone=True), nullable=False),
                    sa.Column("count", sa.Integer(), nullable=False)
                    )


def downgrade():
    pass
