"""Service policy categories

Revision ID: 00dbc8488a06
Revises: f4a20414cf7f
Create Date: 2020-02-18 13:31:00.619331

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '00dbc8488a06'
down_revision = 'f4a20414cf7f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN research_scholarship_compliant tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN code_of_conduct_compliant tinyint(1) default 0"))
    conn.execute(text("ALTER TABLE services ADD COLUMN sirtfi_compliant tinyint(1) default 0"))


def downgrade():
    pass
