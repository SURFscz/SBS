"""Service Pam-WebSSO

Revision ID: 917bdd3b3aa1
Revises: ecba114f48bf
Create Date: 2022-05-05 10:58:27.485134

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '917bdd3b3aa1'
down_revision = 'ecba114f48bf'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN pam_web_sso_enabled tinyint(1) default 0"))


def downgrade():
    pass
