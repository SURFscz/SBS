"""EntityID optional for service_requests

Revision ID: 34e8fe22919d
Revises: 03822b4a9159
Create Date: 2024-06-24 13:23:08.560525

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '34e8fe22919d'
down_revision = '03822b4a9159'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `service_requests` ADD COLUMN entity_id VARCHAR(255) DEFAULT NULL"))


def downgrade():
    pass
