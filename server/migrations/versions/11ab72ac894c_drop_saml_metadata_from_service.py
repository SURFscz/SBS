"""Drop saml_metadata from service

Revision ID: 11ab72ac894c
Revises: 3d84733af2f1
Create Date: 2025-06-03 10:57:44.958392

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '11ab72ac894c'
down_revision = '3d84733af2f1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services DROP COLUMN saml_metadata"))
    conn.execute(text("ALTER TABLE services DROP COLUMN saml_metadata_url"))
    pass


def downgrade():
    pass
