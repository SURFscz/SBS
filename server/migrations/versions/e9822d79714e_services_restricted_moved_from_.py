"""Services restricted moved from organisation to collaboration

Revision ID: e9822d79714e
Revises: e9efdbca87ba
Create Date: 2021-03-03 15:33:01.556148

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e9822d79714e'
down_revision = 'e9efdbca87ba'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN services_restricted tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE collaborations DROP COLUMN services_restricted"))


def downgrade():
    pass
