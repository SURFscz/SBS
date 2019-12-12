# -*- coding: future_fstrings -*-
"""authorisation_groups_invitations many-to-many

Revision ID: 33682b915f2d
Revises: 886b6e662a00
Create Date: 2019-06-19 12:46:17.653862

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '33682b915f2d'
down_revision = '886b6e662a00'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("authorisation_groups_invitations",
                    sa.Column("authorisation_group_id", sa.Integer(),
                              sa.ForeignKey("authorisation_groups.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("invitation_id", sa.Integer(),
                              sa.ForeignKey("invitations.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )


def downgrade():
    pass
