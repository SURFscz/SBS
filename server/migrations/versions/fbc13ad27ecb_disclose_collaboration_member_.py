"""disclose collaboration member information

Revision ID: fbc13ad27ecb
Revises: e5eb9fde77dd
Create Date: 2020-10-05 10:05:07.921001

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'fbc13ad27ecb'
down_revision = 'e5eb9fde77dd'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN disclose_member_information tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN disclose_email_information tinyint(1) default 0"))


def downgrade():
    pass
