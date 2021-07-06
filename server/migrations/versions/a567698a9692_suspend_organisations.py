"""Suspend organisations

Revision ID: a567698a9692
Revises: 4518237d5e60
Create Date: 2021-06-30 07:26:48.193875

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a567698a9692'
down_revision = '4518237d5e60'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'"))
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN last_activity_date DATETIME NOT NULL"
                      " DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN expiry_date DATETIME"))


def downgrade():
    pass
