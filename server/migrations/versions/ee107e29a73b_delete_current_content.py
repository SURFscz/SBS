# -*- coding: future_fstrings -*-
"""Delete current content

Revision ID: ee107e29a73b
Revises: 19e47af16e81
Create Date: 2019-12-11 11:13:42.201461

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'ee107e29a73b'
down_revision = '19e47af16e81'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    tables = [
        "services_collaborations",
        "service_connection_requests",
        "api_keys",
        "organisations_services",
        "aups",
        "collaboration_memberships",
        "collaboration_memberships_groups",
        "collaboration_requests",
        "groups_invitations",
        "invitations",
        "join_requests",
        "organisation_invitations",
        "groups",
        "organisation_memberships",
        "collaborations",
        "organisations",
        "services",
        "users"]
    for table in tables:
        conn.execute(text(f"DELETE FROM `{table}`"))


def downgrade():
    pass
