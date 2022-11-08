"""Attribute is optional in pam_sso_sessions

Revision ID: 70615b99bcb3
Revises: cf912f05482f
Create Date: 2022-11-02 13:05:35.581112

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '70615b99bcb3'
down_revision = 'cf912f05482f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE pam_sso_sessions MODIFY COLUMN attribute VARCHAR(255) NULL"))


def downgrade():
    pass
