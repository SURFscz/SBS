"""User claims

Revision ID: f7045a0cc3ae
Revises: 46313a4fa026
Create Date: 2019-02-06 12:19:08.006431

"""

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f7045a0cc3ae'
down_revision = '46313a4fa026'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN nick_name VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN edu_members VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN affiliation TEXT"))
    conn.execute(text("ALTER TABLE users ADD COLUMN schac_home_organisation VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN family_name VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN given_name VARCHAR(255)"))


def downgrade():
    pass
