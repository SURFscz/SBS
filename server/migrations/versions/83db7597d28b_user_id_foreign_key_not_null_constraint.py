"""User ID foreign key NOT NULL constraint

Revision ID: 83db7597d28b
Revises: 3df7c6c07ccd
Create Date: 2023-03-06 10:39:45.070453

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '83db7597d28b'
down_revision = '3df7c6c07ccd'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("DELETE FROM collaboration_memberships WHERE user_id IS NULL"))
    conn.execute(text("ALTER TABLE collaboration_memberships CHANGE user_id user_id INT NOT NULL"))


def downgrade():
    pass
