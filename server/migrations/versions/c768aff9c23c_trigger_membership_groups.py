# -*- coding: future_fstrings -*-
"""trigger-membership-groups

Revision ID: c768aff9c23c
Revises: 5f6ff88f5b96
Create Date: 2019-12-03 11:02:22.046391

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'c768aff9c23c'
down_revision = '5f6ff88f5b96'
branch_labels = None
depends_on = None


def upgrade():
    # For a new relationship between collaboration_membership and group both collaboration_id values must
    # match.
    trigger = """
CREATE TRIGGER collaboration_memberships_groups_collaboration_id
    BEFORE INSERT ON collaboration_memberships_groups FOR EACH ROW
    BEGIN
        IF (SELECT cm.collaboration_id FROM collaboration_memberships cm WHERE cm.id = NEW.collaboration_membership_id)
         <>
        (SELECT g.collaboration_id FROM `groups` g WHERE g.id = NEW.group_id)
        THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The collaboration ID must be equal for collaboration_memberships_groups';
        END IF ;
    END;
"""
    trigger = re.sub(r"[\n\r\t]", "", trigger)
    conn = op.get_bind()
    conn.execute(text(trigger))


def downgrade():
    pass
