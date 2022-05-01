"""Collaboration tags

Revision ID: ecba114f48bf
Revises: 7c3897d0ca0c
Create Date: 2022-04-30 10:03:16.271103

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'ecba114f48bf'
down_revision = '7c3897d0ca0c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("tags",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("tag_value", sa.Text(), nullable=False),
                    )
    op.create_table("collaboration_tags",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaborations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("tag_id", sa.Integer(), sa.ForeignKey("tags.id", ondelete="cascade"),
                              nullable=False),
                    )


def downgrade():
    pass
