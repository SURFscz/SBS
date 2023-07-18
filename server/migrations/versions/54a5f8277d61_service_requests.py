"""Service requests

Revision ID: 54a5f8277d61
Revises: e4ef08cadbff
Create Date: 2023-07-18 14:50:34.479679

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '54a5f8277d61'
down_revision = 'e4ef08cadbff'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_requests",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("short_name", sa.String(length=255), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("logo", sa.Text(), nullable=True),
                    sa.Column("providing_organisation", sa.String(length=255), nullable=False),
                    sa.Column("login_uri", sa.String(length=255), nullable=True),
                    sa.Column("info_uri", sa.String(length=255), nullable=True),
                    sa.Column("contact_email", sa.String(length=255), nullable=True),
                    sa.Column("support_email", sa.String(length=255), nullable=True),
                    sa.Column("security_email", sa.String(length=255), nullable=True),
                    sa.Column("privacy_policy", sa.String(length=255), nullable=True),
                    sa.Column("accepted_user_policy_uri", sa.String(length=255), nullable=True),
                    sa.Column("code_of_conduct_compliant", sa.Boolean(), nullable=True),
                    sa.Column("sirtfi_compliant", sa.Boolean(), nullable=True),
                    sa.Column("research_scholarship_compliant", sa.Boolean(), nullable=True),
                    sa.Column("connection_type", sa.String(length=255), nullable=True),
                    sa.Column("redirect_urls", sa.Text(), nullable=True),
                    sa.Column("saml_metadata", sa.Text(), nullable=True),
                    sa.Column("saml_metadata_url", sa.String(length=255), nullable=True),
                    sa.Column("comments", sa.Text(), nullable=True),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
                              nullable=False),
                    )


def downgrade():
    pass
