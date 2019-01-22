"""indexes

Revision ID: 6aa49d7cddd2
Revises: a6d9a5b30e14
Create Date: 2019-01-11 13:38:49.578963

"""
from alembic import op

# revision identifiers, used by Alembic.
from sqlalchemy import text

revision = '6aa49d7cddd2'
down_revision = 'a6d9a5b30e14'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # No alembic equivalent for fulltext index
    conn.execute(text("ALTER TABLE collaborations ADD FULLTEXT(name, description)"))
    conn.execute(text("ALTER TABLE services ADD FULLTEXT(name, entity_id, description)"))
    conn.execute(text("ALTER TABLE organisations ADD FULLTEXT(name, description)"))
    conn.execute(text("ALTER TABLE users ADD FULLTEXT(name, email)"))

    conn.execute(text("ALTER TABLE collaborations ADD UNIQUE INDEX collaborations_unique_name(name)"))
    conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX users_unique_uid(uid)"))
    conn.execute(text("ALTER TABLE organisations ADD UNIQUE INDEX organisations_unique_name(name)"))
    conn.execute(text("ALTER TABLE organisations ADD UNIQUE INDEX organisations_unique_tenant(tenant_identifier)"))
    conn.execute(text("ALTER TABLE services ADD UNIQUE INDEX services_unique_entity_id(entity_id)"))
    conn.execute(text(
        "ALTER TABLE authorisation_groups ADD UNIQUE INDEX authorisation_groups_unique_name(name, collaboration_id)"))


def downgrade():
    pass
