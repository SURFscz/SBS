"""Logo for _redesign

Revision ID: f8653b0d35ee
Revises: fbc13ad27ecb
Create Date: 2020-10-26 12:20:23.169740

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f8653b0d35ee'
down_revision = 'fbc13ad27ecb'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    conn.execute(text("ALTER TABLE organisations ADD COLUMN logo MEDIUMTEXT"))
    conn.execute(text("ALTER TABLE services ADD COLUMN logo MEDIUMTEXT"))
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN logo MEDIUMTEXT"))


def downgrade():
    pass
