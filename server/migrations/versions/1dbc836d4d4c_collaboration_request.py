# -*- coding: future_fstrings -*-
"""collaboration request

Revision ID: 1dbc836d4d4c
Revises: 81e0f9f92476
Create Date: 2019-12-05 08:23:41.093508

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1dbc836d4d4c'
down_revision = '81e0f9f92476'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("collaboration_requests",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("short_name", sa.String(length=255), nullable=True),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("accepted_user_policy", sa.String(length=255), nullable=True),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )


def downgrade():
    pass
