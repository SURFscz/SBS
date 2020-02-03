"""Add services_restricted property to Collaboration

Revision ID: f4a20414cf7f
Revises: 2e13959fb398
Create Date: 2020-02-03 10:44:19.766170

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'f4a20414cf7f'
down_revision = '2e13959fb398'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN services_restricted tinyint(1) default 0"))


def downgrade():
    pass
