"""Use mediumtext for logo service_request

Revision ID: 61ac0c0a774d
Revises: 167455b2bc28
Create Date: 2023-08-25 14:51:14.261581

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '61ac0c0a774d'
down_revision = '167455b2bc28'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE service_requests MODIFY logo MEDIUMTEXT"))


def downgrade():
    pass
