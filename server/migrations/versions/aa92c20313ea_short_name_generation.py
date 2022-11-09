"""short_name generation

Revision ID: aa92c20313ea
Revises: 7abfb528d0c1
Create Date: 2019-09-11 16:01:37.119914

"""

# revision identifiers, used by Alembic.


from alembic import op
from sqlalchemy import text

revision = 'aa92c20313ea'
down_revision = '7abfb528d0c1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users DROP INDEX users_short_name"))
    conn.execute(text("ALTER TABLE users DROP COLUMN short_name"))
    conn.execute(text("ALTER TABLE users ADD COLUMN username varchar(255)"))
    conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX users_username(username)"))


def downgrade():
    pass
