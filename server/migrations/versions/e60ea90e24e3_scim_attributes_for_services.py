"""SCIM attributes for services

Revision ID: e60ea90e24e3
Revises: 12991f3c7bad
Create Date: 2022-10-21 15:31:05.125635

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'e60ea90e24e3'
down_revision = '12991f3c7bad'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_enabled tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_url VARCHAR(255)"))
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_bearer_token VARCHAR(512)"))
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_provision_users tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_provision_groups tinyint(1) default 0"))


def downgrade():
    pass
