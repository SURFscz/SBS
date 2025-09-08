"""Added removed colums of #1984

Revision ID: e19c3fd08074
Revises: 46fd9d8d4716
Create Date: 2025-09-08 10:22:06.795380

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e19c3fd08074'
down_revision = '46fd9d8d4716'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN connection_type VARCHAR(255) NULL"))
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN redirect_urls TEXT NULL"))
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN saml_metadata TEXT NULL"))
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN grants TEXT NULL"))
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN is_public_client BOOLEAN NOT NULL DEFAULT false"))
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN oidc_client_secret VARCHAR(255) NULL"))


def downgrade():
    pass
