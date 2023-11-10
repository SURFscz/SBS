"""ldap_identifier in service

Revision ID: e2eec664d30f
Revises: c83522c62564
Create Date: 2023-11-10 08:37:36.395683

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e2eec664d30f'
down_revision = 'c83522c62564'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN ldap_identifier varchar(255)"))
    conn.execute(text("UPDATE services SET ldap_identifier = entity_id"))
    conn.execute(text("ALTER TABLE services CHANGE ldap_identifier ldap_identifier VARCHAR(255) NOT NULL"))


def downgrade():
    pass
