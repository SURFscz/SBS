"""Consisted naming service requests

Revision ID: e1cc6076c951
Revises: e8f8c9ffc508
Create Date: 2023-08-28 16:02:56.556798

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e1cc6076c951'
down_revision = 'e8f8c9ffc508'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests CHANGE short_name abbreviation varchar(255) NOT NULL"))


def downgrade():
    pass
