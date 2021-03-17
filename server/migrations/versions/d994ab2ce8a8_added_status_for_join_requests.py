"""Added status for Join Requests

Revision ID: d994ab2ce8a8
Revises: e25a9c4c91c8
Create Date: 2021-02-05 13:00:14.011611

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd994ab2ce8a8'
down_revision = 'e25a9c4c91c8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE join_requests ADD COLUMN status varchar(255)"))
    conn.execute(text("UPDATE join_requests SET status = 'open'"))
    conn.execute(text("ALTER TABLE join_requests MODIFY status VARCHAR(255) NOT NULL"))


def downgrade():
    pass
