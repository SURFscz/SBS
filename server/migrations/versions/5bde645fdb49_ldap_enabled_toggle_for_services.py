"""LDAP enabled toggle for services

Revision ID: 5bde645fdb49
Revises: aeb043834eb1
Create Date: 2023-03-24 13:49:10.543444

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '5bde645fdb49'
down_revision = 'aeb043834eb1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN ldap_enabled tinyint(1) default 1"))
    conn.execute(text("UPDATE services SET ldap_enabled = 1"))


def downgrade():
    pass
