"""Added lock columns

Revision ID: fdeb5f8ff280
Revises: 5379b7d34505
Create Date: 2026-05-04 14:02:16.218098

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fdeb5f8ff280'
down_revision = '5379b7d34505'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE distributed_locks "
                      "ADD COLUMN lock_until DATETIME NOT NULL, "
                      "ADD COLUMN fencing_token BIGINT NOT NULL DEFAULT 0, "
                      "ADD COLUMN locked_by VARCHAR(255) NOT NULL DEFAULT ''"))


def downgrade():
    pass
