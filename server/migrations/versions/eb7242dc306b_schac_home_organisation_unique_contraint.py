"""schac_home_organisation unique contraint

Revision ID: eb7242dc306b
Revises: 0fc84ca4c14d
Create Date: 2020-11-10 13:38:53.373679

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'eb7242dc306b'
down_revision = '0fc84ca4c14d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations "
                      "ADD UNIQUE INDEX organisation_schac_home_unique(schac_home_organisation)"))


def downgrade():
    pass
