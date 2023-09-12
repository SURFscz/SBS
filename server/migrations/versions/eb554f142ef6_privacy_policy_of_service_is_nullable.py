"""Privacy policy of service is nullable

Revision ID: eb554f142ef6
Revises: 5fd2e80b8e29
Create Date: 2023-09-11 15:56:12.879418

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'eb554f142ef6'
down_revision = '5fd2e80b8e29'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services CHANGE privacy_policy privacy_policy VARCHAR(255) DEFAULT NULL"))
    conn.execute(text("UPDATE services SET privacy_policy = NULL "
                      "WHERE privacy_policy in "
                      "('https://edu.nl/fcgbd', 'https://wiki.surfnet.nl/display/SRAM/No+privacy+policy')"))


def downgrade():
    pass
