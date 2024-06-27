"""Export service external identifier

Revision ID: 9d068149a5c8
Revises: 16ab1308c46a
Create Date: 2024-06-27 15:21:01.764684

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9d068149a5c8'
down_revision = '16ab1308c46a'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN export_external_identifier VARCHAR(255)"))


def downgrade():
    pass
