"""intented_role_invitation

Revision ID: 78639a63a54f
Revises: 6aa49d7cddd2
Create Date: 2019-01-21 13:25:10.022965

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '78639a63a54f'
down_revision = '6aa49d7cddd2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE invitations ADD COLUMN intended_role VARCHAR(255)"))


def downgrade():
    pass
