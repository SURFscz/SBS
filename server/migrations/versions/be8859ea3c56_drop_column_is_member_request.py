"""Drop column is_member_request

Revision ID: be8859ea3c56
Revises: 5bde645fdb49
Create Date: 2023-05-23 09:58:37.789521

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'be8859ea3c56'
down_revision = '5bde645fdb49'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_connection_requests DROP COLUMN is_member_request"))


def downgrade():
    pass
