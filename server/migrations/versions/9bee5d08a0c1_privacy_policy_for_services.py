"""Privacy policy for services

Revision ID: 9bee5d08a0c1
Revises: b1dd0471b0c1
Create Date: 2021-12-02 11:50:55.648833

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9bee5d08a0c1'
down_revision = 'b1dd0471b0c1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN privacy_policy VARCHAR(255)"))
    conn.execute(text("UPDATE services SET privacy_policy = 'https://edu.nl/fcgbd'"))
    conn.execute(text("ALTER TABLE services CHANGE privacy_policy privacy_policy VARCHAR(255) NOT NULL"))


def downgrade():
    pass
