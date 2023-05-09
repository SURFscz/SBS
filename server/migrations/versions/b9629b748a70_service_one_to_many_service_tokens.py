"""Service one-to-many Service Tokens

Revision ID: b9629b748a70
Revises: f34176e815f0
Create Date: 2022-09-18 08:07:59.544585

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'b9629b748a70'
down_revision = 'f34176e815f0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("service_tokens",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("hashed_token", sa.String(length=512), nullable=False),
                    sa.Column("description", sa.Text(), nullable=True),
                    sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )
    conn = op.get_bind()
    result = conn.execute(text("SELECT `id`, `name`, `hashed_token` FROM `services` "
                          "WHERE `hashed_token` IS NOT NULL"))
    for row in result:
        service_id = row[0]
        name = row[1]
        hashed_token = row[2]
        sql = f"INSERT INTO service_tokens (hashed_token, description, service_id, created_by, " \
              f"updated_by) VALUES ('{hashed_token}', '{name} token', {service_id}, 'migration', 'migration')"
        conn.execute(text(sql))

    conn.execute(text("ALTER TABLE services DROP COLUMN hashed_token"))


def downgrade():
    pass
