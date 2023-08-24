"""ServiceRequest has status

Revision ID: 167455b2bc28
Revises: b75a8859f985
Create Date: 2023-08-24 16:02:18.335267

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '167455b2bc28'
down_revision = 'b75a8859f985'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests ADD COLUMN status VARCHAR(255)"))


def downgrade():
    pass
