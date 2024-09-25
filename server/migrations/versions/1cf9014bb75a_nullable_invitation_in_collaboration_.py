"""Nullable invitation in collaboration membership

Revision ID: 1cf9014bb75a
Revises: a2eca2f5ffeb
Create Date: 2024-09-25 12:50:27.943435

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '1cf9014bb75a'
down_revision = 'a2eca2f5ffeb'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_memberships DROP FOREIGN KEY collaboration_memberships_ibfk_3"))
    conn.execute(text("ALTER TABLE collaboration_memberships ADD FOREIGN KEY collaboration_memberships_ibfk_3(invitation_id) "
                      "REFERENCES invitations(id) ON DELETE SET NULL"))


def downgrade():
    pass
