"""disable collaboration join requests

Revision ID: d609f776d07b
Revises: 1be865619f8f
Create Date: 2019-09-11 12:02:14.069592

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd609f776d07b'
down_revision = '1be865619f8f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN disable_join_requests TINYINT(1) DEFAULT 0"))


def downgrade():
    pass
