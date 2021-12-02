"""Description required for collaborations

Revision ID: 20c1def702bc
Revises: 9bee5d08a0c1
Create Date: 2021-12-02 12:28:45.779331

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20c1def702bc'
down_revision = '9bee5d08a0c1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE collaborations SET description = name WHERE description IS NULL OR description = ''"))
    conn.execute(text("ALTER TABLE collaborations CHANGE description description TEXT NOT NULL"))


def downgrade():
    pass
