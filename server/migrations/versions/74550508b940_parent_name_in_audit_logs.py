"""parent name in audit_logs

Revision ID: 74550508b940
Revises: e6353aa63768
Create Date: 2019-12-17 11:38:56.288380

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '74550508b940'
down_revision = 'e6353aa63768'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN parent_name VARCHAR(100)"))


def downgrade():
    pass
