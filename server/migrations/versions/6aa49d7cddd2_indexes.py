"""indexes

Revision ID: 6aa49d7cddd2
Revises: a6d9a5b30e14
Create Date: 2019-01-11 13:38:49.578963

"""
from alembic import op

# revision identifiers, used by Alembic.
from sqlalchemy import text

revision = '6aa49d7cddd2'
down_revision = 'a6d9a5b30e14'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # No alembic equivalent for fulltext index
    conn.execute(text("ALTER TABLE collaborations ADD FULLTEXT(name, description)"))

    conn.execute(text("ALTER TABLE collaborations ADD UNIQUE INDEX collaborations_unique_name(name)"))
    conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX users_unique_uid(uid)"))


def downgrade():
    pass
