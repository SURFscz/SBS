"""Backfill usernames history

Revision ID: 25bdca95116e
Revises: 3cda08121a2f
Create Date: 2021-04-07 08:04:36.467191

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '25bdca95116e'
down_revision = '3cda08121a2f'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_names_history ADD UNIQUE INDEX user_names_history_username(username)"))
    result = conn.execute(text("SELECT username FROM `users` WHERE `username` IS NOT NULL"))
    for row in result:
        username = row[0]
        conn.execute(text(f"INSERT INTO `user_names_history` (`username`) VALUES ('{username}')"))


def downgrade():
    pass
