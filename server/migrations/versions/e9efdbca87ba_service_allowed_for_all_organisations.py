"""Service allowed for all organisations

Revision ID: e9efdbca87ba
Revises: 709dfc363253
Create Date: 2021-02-08 12:32:09.780283

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e9efdbca87ba'
down_revision = '709dfc363253'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN access_allowed_for_all tinyint(1) default 0"))


def downgrade():
    pass
