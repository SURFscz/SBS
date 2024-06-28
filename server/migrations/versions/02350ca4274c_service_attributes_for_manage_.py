"""Service attributes for Manage integration

Revision ID: 02350ca4274c
Revises: c63acd12d7ea
Create Date: 2024-06-17 13:43:53.025342

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '02350ca4274c'
down_revision = 'c63acd12d7ea'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `service_requests` ADD COLUMN grants TEXT NULL"))
    conn.execute(text("ALTER TABLE `service_requests` ADD COLUMN is_public_client TINYINT(1) DEFAULT 0"))

    conn.execute(text("ALTER TABLE `services` ADD COLUMN redirect_urls TEXT DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN saml_metadata TEXT DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN saml_metadata_url VARCHAR(255) DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN oidc_client_secret VARCHAR(255) DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN providing_organisation VARCHAR(255) DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN grants TEXT DEFAULT NULL"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN is_public_client TINYINT(1) DEFAULT 0"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN saml_enabled TINYINT(1) DEFAULT 0"))
    conn.execute(text("ALTER TABLE `services` ADD COLUMN oidc_enabled TINYINT(1) DEFAULT 0"))


def downgrade():
    pass
