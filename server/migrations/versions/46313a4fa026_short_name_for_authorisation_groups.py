"""Short name for authroisation groups

Revision ID: 46313a4fa026
Revises: 78639a63a54f
Create Date: 2019-02-06 08:53:48.841760

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '46313a4fa026'
down_revision = '78639a63a54f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE authorisation_groups ADD COLUMN short_name VARCHAR(255)"))


def downgrade():
    pass
