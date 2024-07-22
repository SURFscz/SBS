"""Added support_email for CO

Revision ID: 91a1b640e465
Revises: eb9f270e3e6f
Create Date: 2024-07-19 13:37:36.758148

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '91a1b640e465'
down_revision = 'eb9f270e3e6f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN support_email VARCHAR(255)"))


def downgrade():
    pass
