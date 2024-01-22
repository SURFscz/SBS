"""Added pin_show to PamSSOSession

Revision ID: 5aab84f28e1e
Revises: 527f14734c00
Create Date: 2024-01-22 10:16:16.371781

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '5aab84f28e1e'
down_revision = '527f14734c00'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE pam_sso_sessions ADD COLUMN pin_shown tinyint(1) default 0"))


def downgrade():
    pass
