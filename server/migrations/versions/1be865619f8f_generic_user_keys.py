# -*- coding: future_fstrings -*-
"""generic user keys

Revision ID: 1be865619f8f
Revises: 2db76678b629
Create Date: 2019-08-26 10:06:19.246305

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '1be865619f8f'
down_revision = '2db76678b629'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_service_profiles DROP COLUMN ssh_key"))

    conn.execute(text("ALTER TABLE users ADD COLUMN ssh_key TEXT"))
    conn.execute(text("ALTER TABLE users ADD COLUMN ubi_key TEXT"))
    conn.execute(text("ALTER TABLE users ADD COLUMN tiqr_key TEXT"))
    conn.execute(text("ALTER TABLE users ADD COLUMN totp_key TEXT"))


def downgrade():
    pass
