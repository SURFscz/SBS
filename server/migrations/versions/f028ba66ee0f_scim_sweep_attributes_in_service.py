"""SCIM Sweep attributes in Service

Revision ID: f028ba66ee0f
Revises: f3c6a6d477f7
Create Date: 2022-12-08 14:36:08.178040

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f028ba66ee0f'
down_revision = 'f3c6a6d477f7'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN sweep_scim_enabled tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN sweep_scim_daily_rate int default 1"))
    conn.execute(text("ALTER TABLE services ADD COLUMN sweep_scim_last_run DATETIME"))


def downgrade():
    pass
