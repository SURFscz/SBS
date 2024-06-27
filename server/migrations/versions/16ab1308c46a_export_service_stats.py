"""Export service stats

Revision ID: 16ab1308c46a
Revises: 34e8fe22919d
Create Date: 2024-06-27 13:01:58.363226

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '16ab1308c46a'
down_revision = '34e8fe22919d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN export_successful tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN exported_at DATETIME"))


def downgrade():
    pass
