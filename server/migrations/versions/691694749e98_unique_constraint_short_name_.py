"""Unique constraint short_name organisations

Revision ID: 691694749e98
Revises: 54a5f8277d61
Create Date: 2023-08-17 10:16:12.432762

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '691694749e98'
down_revision = '54a5f8277d61'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `organisations` ADD UNIQUE INDEX organisations_unique_short_name(short_name)"))


def downgrade():
    pass
