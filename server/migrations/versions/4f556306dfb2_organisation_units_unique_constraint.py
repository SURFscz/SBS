"""Organisation units unique constraint

Revision ID: 4f556306dfb2
Revises: 07cfe7610f2d
Create Date: 2023-10-20 14:34:58.137505

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '4f556306dfb2'
down_revision = '07cfe7610f2d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text(
        "ALTER TABLE units ADD UNIQUE INDEX organisation_units_unique(organisation_id, name)"))


def downgrade():
    pass
