"""Unique key services collaborations

Revision ID: 9078513615f6
Revises: da18d412fb32
Create Date: 2024-10-28 12:34:13.664140

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '9078513615f6'
down_revision = 'da18d412fb32'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # First remove any duplicates
    result = conn.execute(text("SELECT service_id, collaboration_id, count(*) AS duplicate_count "
                               "FROM services_collaborations GROUP BY service_id, collaboration_id "
                               "having duplicate_count > 1"))
    for row in result:
        service_id = row[0]
        collaboration_id = row[1]
        duplicate_count = row[2]
        conn.execute(text(f"DELETE FROM services_collaborations where service_id = {service_id} "
                          f"AND collaboration_id = {collaboration_id} LIMIT {duplicate_count - 1}"))

    conn.execute(text("ALTER TABLE `services_collaborations` "
                      "ADD UNIQUE INDEX services_collaborations_unique(collaboration_id, service_id)"))
    pass


def downgrade():
    pass
