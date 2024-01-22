"""User accepted policies per organisation

Revision ID: 7ff5f119c762
Revises: 41611d873d8f
Create Date: 2024-01-22 11:32:14.334806

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '7ff5f119c762'
down_revision = '41611d873d8f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("organisation_aups",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False,
                              autoincrement=True),
                    sa.Column("aup_url", sa.String(length=255), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id",
                                                                     ondelete="cascade"), nullable=False),
                    sa.Column("organisation_id", sa.Integer(),
                              sa.ForeignKey("organisations.id", ondelete="cascade"), nullable=False),
                    sa.Column("agreed_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
                    )


def downgrade():
    pass
