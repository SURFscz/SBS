"""User suspend notifications

Revision ID: a9fba62c688b
Revises: 10245fbb45a5
Create Date: 2020-05-14 14:45:17.529363

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a9fba62c688b'
down_revision = '10245fbb45a5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("suspend_notifications",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("hash", sa.String(length=255), nullable=False),
                    sa.Column("is_primary", sa.Boolean(), nullable=False, default=False),
                    sa.Column("is_admin_initiated", sa.Boolean(), nullable=False, default=False)
                    )


def downgrade():
    pass
