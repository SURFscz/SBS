"""Added status to CollaborationRequest

Revision ID: 13ef53b88553
Revises: f6d7819e5a39
Create Date: 2020-11-20 15:28:39.447128

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '13ef53b88553'
down_revision = 'f6d7819e5a39'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_requests ADD COLUMN status varchar(255)"))
    conn.execute(text("UPDATE collaboration_requests SET status = 'open'"))
    conn.execute(text("ALTER TABLE collaboration_requests CHANGE status status VARCHAR(255) NOT NULL"))


def downgrade():
    pass
