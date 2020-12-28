"""Added target name to audit_logs

Revision ID: 1b0a01d0a8c6
Revises: d4f2fa3ecf82
Create Date: 2020-12-28 12:24:10.524791

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '1b0a01d0a8c6'
down_revision = 'd4f2fa3ecf82'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN target_name varchar(255)"))


def downgrade():
    pass
