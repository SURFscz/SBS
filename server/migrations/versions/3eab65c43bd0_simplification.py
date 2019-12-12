# -*- coding: future_fstrings -*-
"""Simplification

Revision ID: 3eab65c43bd0
Revises: 212b3edc673e
Create Date: 2019-12-02 09:11:12.340188

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '3eab65c43bd0'
down_revision = '212b3edc673e'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("DROP TRIGGER collaboration_memberships_authorisation_groups_collaboration_id"))
    conn.execute(text("DROP TRIGGER services_authorisation_groups_collaboration"))
    conn.execute(text("DROP TRIGGER user_service_profile_collaboration_membership"))

    conn.execute(text("DROP TABLE authorisation_groups_invitations"))
    conn.execute(text("DROP TABLE collaboration_memberships_authorisation_groups"))
    conn.execute(text("DROP TABLE services_authorisation_groups"))
    conn.execute(text("DROP TABLE user_service_profiles"))
    conn.execute(text("DROP TABLE authorisation_groups"))


def downgrade():
    pass
