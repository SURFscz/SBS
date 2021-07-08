"""Expiry date for membership

Revision ID: 663ed6ebad79
Revises: a567698a9692
Create Date: 2021-07-08 15:53:40.298161

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '663ed6ebad79'
down_revision = 'a567698a9692'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_memberships ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'"))
    conn.execute(text("ALTER TABLE collaboration_memberships ADD COLUMN expiry_date DATETIME"))
    conn.execute(text("ALTER TABLE invitations ADD COLUMN membership_expiry_date DATETIME"))


def downgrade():
    pass
