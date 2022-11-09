"""Service connection requests

Revision ID: e1d529d06e15
Revises: 1dbc836d4d4c
Create Date: 2019-12-10 10:07:10.564280

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e1d529d06e15'
down_revision = '1dbc836d4d4c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE services ADD COLUMN public_visible tinyint(1) default 1"))
    conn.execute(text("ALTER TABLE services ADD COLUMN automatic_connection_allowed tinyint(1) default 1"))

    op.create_table("organisations_services",
                    sa.Column("organisation_id", sa.Integer(),
                              sa.ForeignKey("organisations.id", ondelete="cascade"), nullable=False,
                              primary_key=True),
                    sa.Column("service_id", sa.Integer(),
                              sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False, primary_key=True),
                    )


def downgrade():
    pass
