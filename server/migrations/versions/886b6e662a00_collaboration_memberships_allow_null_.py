# -*- coding: future_fstrings -*-
"""collaboration_memberships allow null user

Revision ID: 886b6e662a00
Revises: 9a0fbeffc75f
Create Date: 2019-06-19 09:43:29.671427

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '886b6e662a00'
down_revision = '9a0fbeffc75f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_memberships modify COLUMN user_id INT(11)"))


def downgrade():
    pass
