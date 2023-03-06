"""Unique organisation and service members

Revision ID: 84c68dedd55d
Revises: 83db7597d28b
Create Date: 2023-03-06 14:36:47.860005

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '84c68dedd55d'
down_revision = '83db7597d28b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        constraint_name="unique_members",
        table_name="organisation_memberships",
        columns=["user_id", "organisation_id"]
    )
    op.create_unique_constraint(
        constraint_name="unique_members",
        table_name="service_memberships",
        columns=["user_id", "service_id"]
    )


def downgrade():
    pass
