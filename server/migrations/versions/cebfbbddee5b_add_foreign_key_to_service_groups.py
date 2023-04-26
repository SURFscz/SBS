"""Add foreign key to service groups

Revision ID: cebfbbddee5b
Revises: c212aeb59073
Create Date: 2023-02-09 09:41:34.291163

"""
from alembic import op

# revision identifiers, used by Alembic.
from sqlalchemy import text

revision = 'cebfbbddee5b'
down_revision = 'c212aeb59073'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # find all service_groups based on the following format <service_shortname>-<service_group_shortname>
    conn.execute(text("UPDATE `groups` AS g INNER JOIN service_groups sg ON sg.name = g.name "
                      "INNER JOIN services s ON s.id = sg.service_id SET g.service_group_id = sg.id "
                      "WHERE g.short_name = concat(s.abbreviation,'-',sg.short_name) "
                      "OR g.short_name = concat(s.abbreviation,'_',sg.short_name)"))


def downgrade():
    pass
