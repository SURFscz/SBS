"""Index on eppn users

Revision ID: 5099c8ca2268
Revises: 1d6ca469ad4e
Create Date: 2025-04-01 10:47:20.797242

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '5099c8ca2268'
down_revision = '1d6ca469ad4e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD INDEX users_eduperson_principal_name(eduperson_principal_name)"))


def downgrade():
    pass
