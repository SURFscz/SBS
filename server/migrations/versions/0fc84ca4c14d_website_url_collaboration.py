"""website url collaboration

Revision ID: 0fc84ca4c14d
Revises: e5d4b81b40e2
Create Date: 2020-11-06 14:21:13.546035

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0fc84ca4c14d'
down_revision = 'e5d4b81b40e2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN website_url VARCHAR(512)"))


def downgrade():
    pass
