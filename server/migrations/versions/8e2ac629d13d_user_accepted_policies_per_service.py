"""User accepted policies per service

Revision ID: 8e2ac629d13d
Revises: a6c5d21f17a0
Create Date: 2021-12-06 12:30:44.326666

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8e2ac629d13d'
down_revision = 'a6c5d21f17a0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_aups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("aup_url", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("agreed_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False)
                    )


def downgrade():
    pass
