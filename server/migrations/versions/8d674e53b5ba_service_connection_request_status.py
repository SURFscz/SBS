"""Service connection request status

Revision ID: 8d674e53b5ba
Revises: a17dc4d237eb
Create Date: 2023-11-20 15:27:22.552257

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '8d674e53b5ba'
down_revision = 'a17dc4d237eb'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests ADD COLUMN pending_organisation_approval "
                      "tinyint(1) default 0"))


def downgrade():
    pass
