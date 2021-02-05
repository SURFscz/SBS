"""Rejection reason for collaboration request

Revision ID: 709dfc363253
Revises: 918d182679bb
Create Date: 2021-02-05 15:53:39.194082

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '709dfc363253'
down_revision = '918d182679bb'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_requests ADD COLUMN rejection_reason text"))


def downgrade():
    pass
