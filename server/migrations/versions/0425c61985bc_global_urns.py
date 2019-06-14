"""Global urns

Revision ID: 0425c61985bc
Revises: a0302c432c15
Create Date: 2019-06-13 12:12:28.709654

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0425c61985bc'
down_revision = 'a0302c432c15'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisations ADD COLUMN short_name VARCHAR(255)"))
    conn.execute(text("ALTER TABLE collaborations ADD COLUMN global_urn text"))
    conn.execute(text("ALTER TABLE authorisation_groups ADD COLUMN global_urn text"))


def downgrade():
    pass
