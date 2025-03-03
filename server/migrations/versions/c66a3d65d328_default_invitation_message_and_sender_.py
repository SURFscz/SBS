"""Default invitation message and sender for Organisations

Revision ID: c66a3d65d328
Revises: 60857a375621
Create Date: 2025-03-03 16:04:06.769690

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'c66a3d65d328'
down_revision = '60857a375621'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN invitation_sender_name VARCHAR(255)"))
    conn.execute(text("ALTER TABLE organisations ADD COLUMN invitation_message TEXT"))


def downgrade():
    pass
