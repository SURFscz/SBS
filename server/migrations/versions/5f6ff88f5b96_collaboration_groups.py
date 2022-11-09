"""authorisation-groups-re-instated

Revision ID: 5f6ff88f5b96
Revises: 8d3cad68dadd
Create Date: 2019-12-03 10:57:25.442611

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '5f6ff88f5b96'
down_revision = '8d3cad68dadd'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("groups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("short_name", sa.String(length=255), nullable=False),
                    sa.Column("global_urn", sa.Text(), nullable=True),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("auto_provision_members", sa.Boolean(), nullable=True),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )

    op.create_table("collaboration_memberships_groups",
                    sa.Column("collaboration_membership_id", sa.Integer(),
                              sa.ForeignKey("collaboration_memberships.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("group_id", sa.Integer(),
                              sa.ForeignKey("groups.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )

    op.create_table("groups_invitations",
                    sa.Column("group_id", sa.Integer(),
                              sa.ForeignKey("groups.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("invitation_id", sa.Integer(),
                              sa.ForeignKey("invitations.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )


def downgrade():
    pass
