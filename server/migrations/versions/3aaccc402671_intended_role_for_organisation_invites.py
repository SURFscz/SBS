"""Intended role for organisation invites

Revision ID: 3aaccc402671
Revises: ce01945b1a69
Create Date: 2020-08-17 10:57:05.519130

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3aaccc402671'
down_revision = 'ce01945b1a69'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE organisation_invitations ADD COLUMN intended_role varchar(255)"))
    conn.execute(text("UPDATE organisation_invitations SET intended_role = 'admin'"))
    conn.execute(text("ALTER TABLE organisation_invitations CHANGE intended_role intended_role VARCHAR(255) NOT NULL"))


def downgrade():
    pass
