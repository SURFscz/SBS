"""CRM Organisation relation with Service

Revision ID: bbde154c31f8
Revises: 91a1b640e465
Create Date: 2024-08-21 15:50:06.058664

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'bbde154c31f8'
down_revision = '91a1b640e465'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `services` ADD COLUMN `crm_organisation_id` INT NULL, "
                      "ADD FOREIGN KEY `services_ibfk_1`(`crm_organisation_id`) "
                      "REFERENCES `organisations`(`id`) ON DELETE CASCADE"))

    result = conn.execute(text("SELECT id, crm_id FROM organisations WHERE crm_id IS NOT NULL"))
    for row in result:
        id = row[0]
        crm_id = row[1]
        conn.execute(text(f"UPDATE `services` SET crm_organisation_id = {id} WHERE crm_id = '{crm_id}'"))

    conn.execute(text("ALTER TABLE services DROP COLUMN crm_id"))


def downgrade():
    pass
