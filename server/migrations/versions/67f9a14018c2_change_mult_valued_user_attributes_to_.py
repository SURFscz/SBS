"""Change mult-valued user attributes to text

Revision ID: 67f9a14018c2
Revises: 556ab932d797
Create Date: 2020-01-16 11:59:50.592554

"""
from alembic import op

# revision identifiers, used by Alembic.
from sqlalchemy import text

revision = '67f9a14018c2'
down_revision = '556ab932d797'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users MODIFY edu_members TEXT"))
    conn.execute(text("ALTER TABLE users MODIFY scoped_affiliation TEXT"))
    conn.execute(text("ALTER TABLE users MODIFY entitlement TEXT"))


def downgrade():
    pass
