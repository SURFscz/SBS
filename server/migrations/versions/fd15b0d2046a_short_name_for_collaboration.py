"""Short name for  collaboration

Revision ID: fd15b0d2046a
Revises: d41c822c7d90
Create Date: 2019-04-10 08:48:57.298695

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fd15b0d2046a'
down_revision = 'd41c822c7d90'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN short_name VARCHAR(255)"))


def downgrade():
    pass
