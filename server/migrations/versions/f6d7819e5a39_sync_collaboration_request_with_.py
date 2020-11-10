"""Sync collaboration-request with collaboration

Revision ID: f6d7819e5a39
Revises: eb7242dc306b
Create Date: 2020-11-10 15:26:09.300127

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f6d7819e5a39'
down_revision = 'eb7242dc306b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_requests ADD COLUMN website_url VARCHAR(512)"))
    conn.execute(text("ALTER TABLE collaboration_requests ADD COLUMN logo MEDIUMTEXT"))


def downgrade():
    pass
