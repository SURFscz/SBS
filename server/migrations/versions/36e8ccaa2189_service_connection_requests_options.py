"""Service Connection Requests Options

Revision ID: 36e8ccaa2189
Revises: 58862ee48741
Create Date: 2019-12-10 10:29:45.963307

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '36e8ccaa2189'
down_revision = '58862ee48741'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_connection_requests",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("message", sa.Text(), nullable=True),
                    sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )


def downgrade():
    pass
