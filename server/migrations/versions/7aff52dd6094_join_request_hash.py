"""join_request hash

Revision ID: 7aff52dd6094
Revises: 1170eb905326
Create Date: 2019-07-09 11:55:31.113306

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '7aff52dd6094'
down_revision = '1170eb905326'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE join_requests ADD COLUMN hash VARCHAR(512)"))


def downgrade():
    pass
