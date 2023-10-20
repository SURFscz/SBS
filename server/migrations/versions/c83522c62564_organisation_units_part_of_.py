"""Organisation units part of OrganisationMembership and CollaborationRequest

Revision ID: c83522c62564
Revises: 4f556306dfb2
Create Date: 2023-10-20 14:45:10.108920

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c83522c62564'
down_revision = '4f556306dfb2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("organisation_membership_units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("organisation_membership_id", sa.Integer(),
                              sa.ForeignKey("organisation_memberships.id", ondelete="cascade"), nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )
    op.create_table("collaboration_requests_units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("collaboration_request_id", sa.Integer(),
                              sa.ForeignKey("collaboration_requests.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )


def downgrade():
    pass
