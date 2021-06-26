"""User mails to be included in the audit_logs

Revision ID: 0d4a2e58ba68
Revises: 8eeae2cf5e84
Create Date: 2021-06-25 17:51:55.201034

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '0d4a2e58ba68'
down_revision = '8eeae2cf5e84'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_mails",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("content", sa.Text(), nullable=False),
                    sa.Column("mail_type", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
