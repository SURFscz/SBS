"""Organisation has services

Revision ID: b6890f54fae1
Revises: 3aaccc402671
Create Date: 2020-08-18 11:34:55.100055

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b6890f54fae1'
down_revision = '3aaccc402671'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("services_organisations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    )


def downgrade():
    pass
