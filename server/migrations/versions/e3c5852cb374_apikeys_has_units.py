"""APIKeys has units

Revision ID: e3c5852cb374
Revises: 9078513615f6
Create Date: 2025-01-03 11:53:05.164484

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e3c5852cb374'
down_revision = '9078513615f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("api_key_units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("api_key_id", sa.Integer(),
                              sa.ForeignKey("api_keys.id", ondelete="cascade"), nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )


def downgrade():
    pass
