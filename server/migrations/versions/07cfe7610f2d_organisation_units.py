"""Organisation units

Revision ID: 07cfe7610f2d
Revises: 7b2c17d60467
Create Date: 2023-10-20 14:24:49.872836

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '07cfe7610f2d'
down_revision = '7b2c17d60467'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    )
    op.create_table("collaboration_units",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("collaboration_id", sa.Integer(),
                              sa.ForeignKey("collaborations.id", ondelete="cascade"), nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )
    op.create_table("units_organisation_invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("organisation_invitation_id", sa.Integer(),
                              sa.ForeignKey("organisation_invitations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("unit_id", sa.Integer(),
                              sa.ForeignKey("units.id", ondelete="cascade"), nullable=False),
                    )


def downgrade():
    pass
