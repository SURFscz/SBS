"""Pin number to PamWebSSO

Revision ID: 9fd8b70b083a
Revises: 8a0123c226ce
Create Date: 2022-05-06 11:20:13.269267

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9fd8b70b083a'
down_revision = '8a0123c226ce'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE pam_sso_sessions ADD COLUMN pin CHAR(4)"))


def downgrade():
    pass
