"""token based services

Revision ID: a2b043f1aab7
Revises: 8e2ac629d13d
Create Date: 2021-12-08 13:46:15.352563

"""

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a2b043f1aab7'
down_revision = '8e2ac629d13d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN token_enabled tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN hashed_token VARCHAR(255)"))
    conn.execute(text("ALTER TABLE services ADD COLUMN token_validity_days int default 1"))


def downgrade():
    pass
