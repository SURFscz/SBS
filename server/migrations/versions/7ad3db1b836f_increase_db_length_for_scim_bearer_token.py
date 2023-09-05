"""Increase DB length for scim_bearer_token

Revision ID: 7ad3db1b836f
Revises: 56d19567602e
Create Date: 2023-09-05 13:39:45.443418

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '7ad3db1b836f'
down_revision = '56d19567602e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services MODIFY scim_bearer_token MEDIUMTEXT"))


def downgrade():
    pass
