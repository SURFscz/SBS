"""SCUM URL is required

Revision ID: 93fcea9046a9
Revises: f28b51b5dd3b
Create Date: 2023-02-15 11:54:01.221129

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '93fcea9046a9'
down_revision = 'f28b51b5dd3b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE services SET scim_enabled = 0  WHERE scim_url IS NULL OR TRIM(scim_url) = ''"))


def downgrade():
    pass
