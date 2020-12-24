"""Unique constraint for SchacHomeOrganisation names

Revision ID: d4f2fa3ecf82
Revises: f9ceb922c568
Create Date: 2020-12-24 15:28:41.477370

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'd4f2fa3ecf82'
down_revision = 'f9ceb922c568'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE schac_home_organisations "
                      "ADD UNIQUE INDEX schac_home_organisation_name_unique(name)"))


def downgrade():
    pass
