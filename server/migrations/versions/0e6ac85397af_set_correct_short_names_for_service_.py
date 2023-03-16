"""set correct short_names for service groups

Revision ID: 0e6ac85397af
Revises: 7f26eec7f91c
Create Date: 2023-03-16 14:49:26.339271

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0e6ac85397af'
down_revision = '7f26eec7f91c'
branch_labels = None
depends_on = None


def upgrade():
    sql = """
        update groups g
            left join service_groups sg on g.service_group_id=sg.id
            left join services s on sg.service_id=s.id
            left join collaborations c on g.collaboration_id=c.id
        set g.short_name=CONCAT(s.abbreviation, '-', sg.short_name),
            g.global_urn=CONCAT(c.global_urn, ':', s.abbreviation, '-', sg.short_name)
        where g.service_group_id is not NULL
          and g.short_name!=CONCAT(s.abbreviation, '-', sg.short_name)
    """
    conn = op.get_bind()
    conn.execute(sa.text(sql))


def downgrade():
    pass
