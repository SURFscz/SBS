"""Added is_member_requests to service_connection_requests

Revision ID: e25a9c4c91c8
Revises: 1b0a01d0a8c6
Create Date: 2021-01-25 10:37:24.809348

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e25a9c4c91c8'
down_revision = '1b0a01d0a8c6'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(
        text("ALTER TABLE service_connection_requests ADD COLUMN is_member_request tinyint(1) default 0"))


def downgrade():
    pass
