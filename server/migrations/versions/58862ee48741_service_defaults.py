"""Service defaults

Revision ID: 58862ee48741
Revises: e1d529d06e15
Create Date: 2019-12-10 10:24:58.181688

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '58862ee48741'
down_revision = 'e1d529d06e15'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE services SET public_visible=1"))
    conn.execute(text("UPDATE services SET automatic_connection_allowed=1"))


def downgrade():
    pass
