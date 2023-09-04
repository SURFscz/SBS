"""Schac home organisation lower case

Revision ID: 56d19567602e
Revises: e1cc6076c951
Create Date: 2023-09-04 09:30:51.707127

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '56d19567602e'
down_revision = 'e1cc6076c951'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE schac_home_organisations SET name = LOWER(name)"))
    conn.execute(text("UPDATE users SET schac_home_organisation = LOWER(schac_home_organisation)"))


def downgrade():
    pass
