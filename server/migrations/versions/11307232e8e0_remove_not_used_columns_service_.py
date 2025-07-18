"""Remove not used columns service_registrations

Revision ID: 11307232e8e0
Revises: 46fd9d8d4716
Create Date: 2025-06-05 14:26:55.867773

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '11307232e8e0'
down_revision = '46fd9d8d4716'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN connection_type"))
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN redirect_urls"))
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN saml_metadata"))
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN grants"))
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN is_public_client"))
    conn.execute(text("ALTER TABLE service_requests DROP COLUMN oidc_client_secret"))


def downgrade():
    pass
