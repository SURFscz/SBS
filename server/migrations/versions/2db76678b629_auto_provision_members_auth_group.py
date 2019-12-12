# -*- coding: future_fstrings -*-
"""auto_provision_members_auth_group

Revision ID: 2db76678b629
Revises: a1d19d358c21
Create Date: 2019-07-09 16:29:52.004255

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '2db76678b629'
down_revision = 'a1d19d358c21'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE authorisation_groups ADD COLUMN auto_provision_members tinyint(1) default 0"))


def downgrade():
    pass
