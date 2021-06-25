"""User can have multiple SSH keys

Revision ID: 8eeae2cf5e84
Revises: 4fdf4258598e
Create Date: 2021-06-25 11:33:42.648848

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '8eeae2cf5e84'
down_revision = '4fdf4258598e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("ssh_keys",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("ssh_value", sa.Text(), nullable=False),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="cascade"),
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
    conn.execute(text("UPDATE users SET `ssh_key` = NULL where `ssh_key` = ''"))

    result = conn.execute("SELECT `ssh_key`, `id` FROM `users` WHERE `ssh_key` IS NOT NULL")
    for row in result:
        ssh_key = row["ssh_key"]
        conn.execute(f"INSERT INTO `ssh_keys` (`ssh_value`, `user_id`, `created_by`, `updated_by`) "
                     f"VALUES ('{ssh_key}', {row['id']}, 'migration', 'migration')")

    conn.execute(text("ALTER TABLE users DROP COLUMN ssh_key"))


def downgrade():
    pass
