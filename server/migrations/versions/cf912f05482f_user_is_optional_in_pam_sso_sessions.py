"""User is optional in pam_sso_sessions

Revision ID: cf912f05482f
Revises: e60ea90e24e3
Create Date: 2022-11-02 12:38:26.051421

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'cf912f05482f'
down_revision = 'e60ea90e24e3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE pam_sso_sessions MODIFY COLUMN user_id INT NULL"))


def downgrade():
    pass
