"""On-boarding msg organisation

Revision ID: e65060f35368
Revises: 13ef53b88553
Create Date: 2020-12-13 07:57:45.019909

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e65060f35368'
down_revision = '13ef53b88553'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN on_boarding_msg MEDIUMTEXT"))


def downgrade():
    pass
