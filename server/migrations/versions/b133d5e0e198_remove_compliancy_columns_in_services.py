"""Remove compliancy columns in services

Revision ID: b133d5e0e198
Revises: 811a3753d09f
Create Date: 2024-04-03 11:32:33.606028

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b133d5e0e198'
down_revision = '811a3753d09f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `services` DROP COLUMN research_scholarship_compliant"))
    conn.execute(text("ALTER TABLE `services` DROP COLUMN code_of_conduct_compliant"))
    conn.execute(text("ALTER TABLE `services` DROP COLUMN sirtfi_compliant"))
    conn.execute(text("ALTER TABLE `service_requests` DROP COLUMN research_scholarship_compliant"))
    conn.execute(text("ALTER TABLE `service_requests` DROP COLUMN code_of_conduct_compliant"))
    conn.execute(text("ALTER TABLE `service_requests` DROP COLUMN sirtfi_compliant"))


def downgrade():
    pass
