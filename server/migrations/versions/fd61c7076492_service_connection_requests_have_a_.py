"""Service connection requests have a status

Revision ID: fd61c7076492
Revises: 7ff5f119c762
Create Date: 2024-02-27 10:53:00.679801

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fd61c7076492'
down_revision = '7ff5f119c762'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests ADD COLUMN status varchar(255)"))
    conn.execute(text("UPDATE service_connection_requests SET status = 'open'"))
    conn.execute(text("ALTER TABLE service_connection_requests CHANGE status status VARCHAR(255) NOT NULL"))


def downgrade():
    pass
