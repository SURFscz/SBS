"""collaboration_memberships optional link to invitation

Revision ID: 9a0fbeffc75f
Revises: dff51c0bcc23
Create Date: 2019-06-19 09:34:16.990860

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9a0fbeffc75f'
down_revision = 'dff51c0bcc23'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE collaboration_memberships ADD COLUMN invitation_id INT(11), "
                      "ADD FOREIGN KEY collaboration_memberships_ibfk_3(invitation_id) REFERENCES invitations(id)"))


def downgrade():
    pass
