"""User nounces for EB integration

Revision ID: ebd257c3e9d3
Revises: 9ec140457920
Create Date: 2025-03-24 10:28:20.464408

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'ebd257c3e9d3'
down_revision = '9ec140457920'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_nonces",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False,
                              autoincrement=True),
                    sa.Column("nonce", sa.String(length=255), nullable=False),
                    sa.Column("issuer_id", sa.String(length=255), nullable=True),
                    sa.Column("requested_service_entity_id", sa.String(length=255), nullable=True),
                    sa.Column("continue_url", sa.String(length=512), nullable=False),
                    sa.Column("error_status", sa.Integer(), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id",
                                                                     ondelete="cascade"), nullable=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id",
                                                                        ondelete="cascade"), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
                    )


def downgrade():
    pass
