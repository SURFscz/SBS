"""Invitation reminder send

Revision ID: 811a3753d09f
Revises: e7e7dd87f94c
Create Date: 2024-03-01 12:01:46.376594

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '811a3753d09f'
down_revision = 'e7e7dd87f94c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE invitations ADD COLUMN reminder_send tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE organisation_invitations ADD COLUMN reminder_send tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE service_invitations ADD COLUMN reminder_send tinyint(1) default 0"))


def downgrade():
    pass
