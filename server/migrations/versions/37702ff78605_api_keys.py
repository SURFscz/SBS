"""API keys

Revision ID: 37702ff78605
Revises: 0425c61985bc
Create Date: 2019-06-13 15:09:49.451832

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '37702ff78605'
down_revision = '0425c61985bc'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("api_keys",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hashed_secret", sa.String(length=512), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=512), nullable=False),
                    sa.Column("updated_by", sa.String(length=512), nullable=False),
                    )


def downgrade():
    pass
