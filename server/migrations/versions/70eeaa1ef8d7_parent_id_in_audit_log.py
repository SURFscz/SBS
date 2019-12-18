"""Parent ID in audit log

Revision ID: 70eeaa1ef8d7
Revises: 74550508b940
Create Date: 2019-12-18 10:50:03.164804

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '70eeaa1ef8d7'
down_revision = '74550508b940'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN parent_id INT(11)"))


def downgrade():
    pass
