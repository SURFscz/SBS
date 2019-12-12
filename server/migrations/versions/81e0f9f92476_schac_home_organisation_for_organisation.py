# -*- coding: future_fstrings -*-
"""schac_home_organisation for organisation

Revision ID: 81e0f9f92476
Revises: c768aff9c23c
Create Date: 2019-12-04 11:40:20.585529

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '81e0f9f92476'
down_revision = 'c768aff9c23c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN schac_home_organisation varchar(255)"))


def downgrade():
    pass
