"""Added accepted_user_policy to organisations

Revision ID: 41611d873d8f
Revises: 5aab84f28e1e
Create Date: 2024-01-22 11:28:09.526909

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '41611d873d8f'
down_revision = '5aab84f28e1e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN accepted_user_policy varchar(255) DEFAULT NULL"))


def downgrade():
    pass
