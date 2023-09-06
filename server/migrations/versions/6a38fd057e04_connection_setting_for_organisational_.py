"""Connection setting for organisational access

Revision ID: 6a38fd057e04
Revises: 7ad3db1b836f
Create Date: 2023-09-06 09:29:46.006634

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '6a38fd057e04'
down_revision = '7ad3db1b836f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN connection_setting VARCHAR(255)"))

    result = conn.execute(text("SELECT id FROM services WHERE automatic_connection_allowed = 0 "
                               "AND access_allowed_for_all = 0 AND non_member_users_access_allowed = 0"))
    for row in result:
        service_id = row[0]
        sql = text("SELECT COUNT(*) FROM organisations_services os "
                   "INNER JOIN services s ON s.id = os.service_id WHERE service_id = :service_id")
        result = conn.execute(sql, dict(service_id=service_id))
        count_os = next(result, (0,))[0]
        sql = text("SELECT COUNT(*) FROM automatic_connection_allowed_organisations_services os "
                   "INNER JOIN services s ON s.id = os.service_id WHERE service_id = :service_id")
        result = conn.execute(sql, dict(service_id=service_id))
        count_as = next(result, (0,))[0]
        connection_setting = "NO_ONE_ALLOWED"
        if count_os == 0 and count_as > 0:
            connection_setting = "IT_DEPENDS"
        elif count_os > 0 and count_as == 0:
            connection_setting = "MANUALLY_APPROVE"
        conn.execute(text(f"UPDATE services SET connection_setting = '{connection_setting}' where id = {service_id}"))


def downgrade():
    pass
