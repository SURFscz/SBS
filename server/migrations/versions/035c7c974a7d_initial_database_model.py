"""Initial database model

Revision ID: 035c7c974a7d
Revises:
Create Date: 2018-12-18 15:43:16.204109

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '035c7c974a7d'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("uid", sa.String(length=512), nullable=False),
                    sa.Column("name", sa.String(length=255), nullable=True),
                    sa.Column("email", sa.String(length=255), nullable=True), )


def downgrade():
    op.drop_table("users")
