"""Not null description for tokens and API keys

Revision ID: 37e79c5ba3ad
Revises: 7af68b388fdd
Create Date: 2023-02-02 15:30:11.582763

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '37e79c5ba3ad'
down_revision = '7af68b388fdd'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    sql = "UPDATE service_tokens st set st.description = (select s.name from services s where id = st.service_id)" \
          " WHERE TRIM(`description`) = '' OR description IS NULL"
    conn.execute(text(sql))
    conn.execute(text("ALTER TABLE `service_tokens` CHANGE description description TEXT NOT NULL"))

    sql = "UPDATE api_keys ak SET ak.description = (SELECT o.name FROM organisations o WHERE id = ak.organisation_id)" \
          " WHERE TRIM(`description`) = '' OR description IS NULL"
    conn.execute(text(sql))
    conn.execute(text("ALTER TABLE `api_keys` CHANGE description description TEXT NOT NULL"))


def downgrade():
    pass
