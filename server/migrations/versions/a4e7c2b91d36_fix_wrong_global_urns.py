"""Fix wrong global_urn values of collaborations and groups

Revision ID: a4e7c2b91d36
Revises: 3c1d7a9e5b42
Create Date: 2026-11-09 10:00:00.000000

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a4e7c2b91d36'
down_revision = '3c1d7a9e5b42'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # The global_urn of a collaboration is <organisation.short_name>:<collaboration.short_name>
    conn.execute(text(
        "UPDATE `collaborations` c "
        "INNER JOIN `organisations` o ON o.id = c.organisation_id "
        "SET c.global_urn = CONCAT(o.short_name, ':', c.short_name) "
        "WHERE NOT (c.global_urn <=> CONCAT(o.short_name, ':', c.short_name))"
    ))

    # The global_urn of a group is <organisation.short_name>:<collaboration.short_name>:<group.short_name>
    conn.execute(text(
        "UPDATE `groups` g "
        "INNER JOIN `collaborations` c ON c.id = g.collaboration_id "
        "INNER JOIN `organisations` o ON o.id = c.organisation_id "
        "SET g.global_urn = CONCAT(o.short_name, ':', c.short_name, ':', g.short_name) "
        "WHERE NOT (g.global_urn <=> CONCAT(o.short_name, ':', c.short_name, ':', g.short_name))"
    ))


def downgrade():
    pass
