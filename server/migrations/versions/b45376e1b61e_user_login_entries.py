"""user login entries

Revision ID: b45376e1b61e
Revises: 9fd8b70b083a
Create Date: 2022-06-21 14:44:36.734906

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b45376e1b61e'
down_revision = '9fd8b70b083a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_logins",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
