"""re-create dropped triggers

Revision ID: e6353aa63768
Revises: e064b8fcb7d0
Create Date: 2019-12-12 16:42:51.108284

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e6353aa63768'
down_revision = 'e064b8fcb7d0'
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
