"""collaboration_creation_allowed column in organisations

Revision ID: 556ab932d797
Revises: 70eeaa1ef8d7
Create Date: 2020-01-16 09:19:55.578729

"""
from alembic import op

# revision identifiers, used by Alembic.
from sqlalchemy import text

revision = '556ab932d797'
down_revision = '70eeaa1ef8d7'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN collaboration_creation_allowed tinyint(1) default 0"))


def downgrade():
    pass
