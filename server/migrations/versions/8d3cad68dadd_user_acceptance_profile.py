"""user acceptance profile

Revision ID: 8d3cad68dadd
Revises: 3eab65c43bd0
Create Date: 2019-12-02 13:46:40.450327

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8d3cad68dadd'
down_revision = '3eab65c43bd0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("aups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("au_version", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"), nullable=False),
                    sa.Column("agreed_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False)
                    )


def downgrade():
    pass
