"""Services have automatic_connection_allowed_organisations

Revision ID: 0aafb26a14a7
Revises: 27d6030990b5
Create Date: 2022-11-25 16:27:26.981177

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '0aafb26a14a7'
down_revision = '27d6030990b5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("automatic_connection_allowed_organisations_services",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    )


def downgrade():
    pass
