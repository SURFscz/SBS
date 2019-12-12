"""Audit log

Revision ID: f3335de0e6ff
Revises: ee107e29a73b
Create Date: 2019-12-12 12:25:36.076108

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f3335de0e6ff'
down_revision = 'ee107e29a73b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("audit_logs",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), nullable=True),
                    sa.Column("subject_id", sa.Integer(), nullable=True),
                    sa.Column("target_type", sa.String(length=255), nullable=True),
                    sa.Column("target_id", sa.Integer(), nullable=True),
                    sa.Column("action", sa.Integer(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("state_before", sa.Text(), nullable=True),
                    sa.Column("state_after", sa.Text(), nullable=True),
                    )


def downgrade():
    pass
