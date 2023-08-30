"""Sync column names service_requests

Revision ID: e8f8c9ffc508
Revises: 105db70cc7a5
Create Date: 2023-08-28 13:55:55.984837

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e8f8c9ffc508'
down_revision = '105db70cc7a5'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests CHANGE accepted_user_policy_uri "
                      "accepted_user_policy varchar(255) DEFAULT NULL"))
    conn.execute(text("ALTER TABLE service_requests CHANGE login_uri uri varchar(255) DEFAULT NULL"))
    conn.execute(text("ALTER TABLE service_requests CHANGE info_uri uri_info varchar(255) DEFAULT NULL"))


def downgrade():
    pass
