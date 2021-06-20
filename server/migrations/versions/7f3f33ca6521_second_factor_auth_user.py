"""Second factor auth user

Revision ID: 7f3f33ca6521
Revises: 25bdca95116e
Create Date: 2021-06-20 10:39:10.360903

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '7f3f33ca6521'
down_revision = '25bdca95116e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN second_factor_auth VARCHAR(255)"))


def downgrade():
    pass
