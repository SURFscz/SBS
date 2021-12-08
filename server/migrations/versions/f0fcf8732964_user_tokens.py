"""user tokens

Revision ID: f0fcf8732964
Revises: a2b043f1aab7
Create Date: 2021-12-08 14:00:38.997358

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f0fcf8732964'
down_revision = 'a2b043f1aab7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_tokens",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("hashed_token", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("last_used_date", sa.DateTime(timezone=True), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    )


def downgrade():
    pass
