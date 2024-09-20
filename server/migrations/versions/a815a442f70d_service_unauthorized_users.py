"""Service unauthorized users

Revision ID: a815a442f70d
Revises: cf89d41f30fe
Create Date: 2024-09-20 15:06:27.163469

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a815a442f70d'
down_revision = 'cf89d41f30fe'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `services` ADD COLUMN support_email_unauthorized_users TINYINT(1) DEFAULT 0"))


def downgrade():
    pass
