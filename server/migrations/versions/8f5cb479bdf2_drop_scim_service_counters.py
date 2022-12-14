"""Drop scim_service_counters

Revision ID: 8f5cb479bdf2
Revises: f028ba66ee0f
Create Date: 2022-12-14 11:14:41.754800

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '8f5cb479bdf2'
down_revision = 'f028ba66ee0f'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("scim_service_counters")
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services DROP COLUMN scim_provision_users"))
    conn.execute(text("ALTER TABLE services DROP COLUMN scim_provision_groups"))


def downgrade():
    pass
