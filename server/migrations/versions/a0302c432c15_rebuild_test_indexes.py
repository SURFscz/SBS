# -*- coding: future_fstrings -*-
"""rebuild-test-indexes

Revision ID: a0302c432c15
Revises: fd15b0d2046a
Create Date: 2019-05-08 13:54:33.777069

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a0302c432c15'
down_revision = 'fd15b0d2046a'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # No alembic equivalent for fulltext index
    conn.execute(text("DROP INDEX name ON collaborations"))
    conn.execute(text("DROP INDEX name ON services"))
    conn.execute(text("DROP INDEX name ON organisations"))
    conn.execute(text("DROP INDEX name ON users"))

    conn.execute(text("CREATE FULLTEXT INDEX ft_collaborations_search ON collaborations(name, description)"))
    conn.execute(text("CREATE FULLTEXT INDEX ft_services_search ON services(name, entity_id, description)"))
    conn.execute(text("CREATE FULLTEXT INDEX ft_organisations_search ON organisations(name, description)"))
    conn.execute(text("CREATE FULLTEXT INDEX ft_users_search ON users(name, email)"))


def downgrade():
    pass
