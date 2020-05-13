"""application uid and eduperson_principal_name

Revision ID: 96beda7bf574
Revises: ce633d58f432
Create Date: 2020-05-13 13:32:45.853689

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '96beda7bf574'
down_revision = 'ce633d58f432'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users ADD COLUMN application_uid VARCHAR(255)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN eduperson_principal_name VARCHAR(255)"))


def downgrade():
    pass
