"""AUP for collaborations is text

Revision ID: b131f94b231c
Revises: 2c5fddba8f50
Create Date: 2021-10-01 14:45:28.305883

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b131f94b231c'
down_revision = '2c5fddba8f50'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `collaborations` CHANGE accepted_user_policy accepted_user_policy MEDIUMTEXT"))


def downgrade():
    pass
