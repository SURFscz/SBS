"""Unique constraint nonce

Revision ID: 86aa25bc5279
Revises: ebd257c3e9d3
Create Date: 2025-03-24 11:23:15.068141

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '86aa25bc5279'
down_revision = 'ebd257c3e9d3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE user_nonces ADD UNIQUE INDEX user_nonces_unique_nonce(nonce)"))


def downgrade():
    pass
