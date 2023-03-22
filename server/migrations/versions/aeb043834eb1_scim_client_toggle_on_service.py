"""SCIM client toggle on service

Revision ID: aeb043834eb1
Revises: ddd3db82f370
Create Date: 2023-03-22 07:38:45.278885

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'aeb043834eb1'
down_revision = 'ddd3db82f370'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN scim_client_enabled tinyint(1) default 0"))
    query = text("""
        UPDATE services AS s2 INNER JOIN
        (SELECT s.id FROM services s INNER JOIN service_tokens st ON s.id = st.service_id
            WHERE st.token_type = :token_type)
        AS s3 ON s3.id = s2.id SET s2.scim_client_enabled = 1;
    """)
    conn.execute(query, token_type="scim")


def downgrade():
    pass
