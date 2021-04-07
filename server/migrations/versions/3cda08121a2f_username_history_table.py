"""Username history table

Revision ID: 3cda08121a2f
Revises: e9822d79714e
Create Date: 2021-04-07 07:57:16.659821

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '3cda08121a2f'
down_revision = 'e9822d79714e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_names_history",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("username", sa.String(length=255), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
