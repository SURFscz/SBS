"""Added unspecified_id to User

Revision ID: de86064c8a69
Revises: 1d175e8e4c29
Create Date: 2022-04-25 13:55:21.017855

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'de86064c8a69'
down_revision = '1d175e8e4c29'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN home_organisation_uid varchar(512)"))


def downgrade():
    pass