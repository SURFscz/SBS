"""External identifier invitation

Revision ID: a9a71287d8f2
Revises: f0fcf8732964
Create Date: 2021-12-28 12:27:26.052977

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a9a71287d8f2'
down_revision = 'f0fcf8732964'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `invitations` ADD COLUMN external_identifier VARCHAR(255)"))


def downgrade():
    pass
