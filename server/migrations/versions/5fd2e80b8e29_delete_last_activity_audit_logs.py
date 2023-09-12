"""Delete last_activity audit logs

Revision ID: 5fd2e80b8e29
Revises: 6a38fd057e04
Create Date: 2023-09-11 15:25:38.661986

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '5fd2e80b8e29'
down_revision = '6a38fd057e04'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("""
        DELETE FROM audit_logs WHERE state_after RLIKE '^{"last_activity_date":[0-9]+}.$'
        AND target_type = 'collaborations'
    """))

    def downgrade():
        pass
