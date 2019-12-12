"""Primary keys on all tables

Revision ID: e064b8fcb7d0
Revises: f3335de0e6ff
Create Date: 2019-12-12 13:04:19.534781

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e064b8fcb7d0'
down_revision = 'f3335de0e6ff'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("DROP TABLE organisation_memberships"))

    op.create_table("organisation_memberships",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("role", sa.String(length=255), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )
    conn.execute(text("DROP TABLE services_collaborations"))
    op.create_table("services_collaborations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    )

    conn.execute(text("DROP TABLE collaboration_memberships_groups"))
    op.create_table("collaboration_memberships_groups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("collaboration_membership_id", sa.Integer(),
                              sa.ForeignKey("collaboration_memberships.id", ondelete="cascade"), nullable=False),
                    sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="cascade"),
                              nullable=False),
                    )

    conn.execute(text("DROP TABLE groups_invitations"))
    op.create_table("groups_invitations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="cascade"), nullable=False),
                    sa.Column("invitation_id", sa.Integer(), sa.ForeignKey("invitations.id", ondelete="cascade"),
                              nullable=False),
                    )

    conn.execute(text("DROP TABLE organisations_services"))
    op.create_table("organisations_services",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("organisation_id", sa.Integer(),
                              sa.ForeignKey("organisations.id", ondelete="cascade"), nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    )


def downgrade():
    pass
