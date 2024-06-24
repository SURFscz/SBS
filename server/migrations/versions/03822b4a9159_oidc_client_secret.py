"""OIDC client secret

Revision ID: 03822b4a9159
Revises: 02350ca4274c
Create Date: 2024-06-24 11:41:03.386868

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '03822b4a9159'
down_revision = '02350ca4274c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `service_requests` ADD COLUMN oidc_client_secret VARCHAR(255) DEFAULT NULL"))


def downgrade():
    pass
