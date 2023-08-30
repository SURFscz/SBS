"""Sync column names service_requests

Revision ID: e8f8c9ffc508
Revises: 105db70cc7a5
Create Date: 2023-08-28 13:55:55.984837

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e8f8c9ffc508'
down_revision = '105db70cc7a5'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests RENAME COLUMN accepted_user_policy_uri TO accepted_user_policy"))
    conn.execute(text("ALTER TABLE service_requests RENAME COLUMN login_uri TO uri"))
    conn.execute(text("ALTER TABLE service_requests RENAME COLUMN info_uri TO uri_info"))


def downgrade():
    pass
