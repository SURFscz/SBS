"""Organisation approves service requests

Revision ID: a17dc4d237eb
Revises: e2eec664d30f
Create Date: 2023-11-20 14:56:22.937571

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a17dc4d237eb'
down_revision = 'e2eec664d30f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN service_connection_requires_approval tinyint(1) default 0"))


def downgrade():
    pass
