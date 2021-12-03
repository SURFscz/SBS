"""LDAP password for service

Revision ID: ceb3c5f653b0
Revises: 522946172115
Create Date: 2021-12-03 12:59:05.692772

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'ceb3c5f653b0'
down_revision = '522946172115'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN ldap_password VARCHAR(255)"))


def downgrade():
    pass
