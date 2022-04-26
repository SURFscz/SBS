"""Mark an user with SSID required

Revision ID: 7c3897d0ca0c
Revises: de86064c8a69
Create Date: 2022-04-26 11:01:40.165770

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '7c3897d0ca0c'
down_revision = 'de86064c8a69'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN ssid_required tinyint(1) default 0"))


def downgrade():
    pass
