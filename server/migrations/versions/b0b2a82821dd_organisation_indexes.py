"""organisation indexes

Revision ID: b0b2a82821dd
Revises: 7aff52dd6094
Create Date: 2019-07-09 13:57:51.385917

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b0b2a82821dd'
down_revision = '7aff52dd6094'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaborations DROP INDEX collaborations_unique_name"))
    conn.execute(text("ALTER TABLE collaborations ADD UNIQUE INDEX collaborations_unique_name(name, organisation_id)"))
    conn.execute(text("ALTER TABLE collaborations ADD UNIQUE "
                      "INDEX collaborations_unique_short_name(short_name, organisation_id)"))


def downgrade():
    pass
