"""Do we delete orphans in the SCIM sweep per service

Revision ID: 7af68b388fdd
Revises: 8f5cb479bdf2
Create Date: 2022-12-19 11:10:20.950681

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '7af68b388fdd'
down_revision = '8f5cb479bdf2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN sweep_remove_orphans tinyint(1) default 0"))


def downgrade():
    pass
