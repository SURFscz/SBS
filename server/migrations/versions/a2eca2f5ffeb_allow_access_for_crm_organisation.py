"""Allow access for CRM organisation

Revision ID: a2eca2f5ffeb
Revises: a815a442f70d
Create Date: 2024-09-24 09:54:59.853687

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a2eca2f5ffeb'
down_revision = 'a815a442f70d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `services` ADD COLUMN access_allowed_for_crm_organisation TINYINT(1) DEFAULT 0"))


def downgrade():
    pass
