"""triggers for data consistency

Revision ID: 1e694ddc996d
Revises: 25c5d39c90a8
Create Date: 2019-02-21 13:44:24.649292

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '1e694ddc996d'
down_revision = '25c5d39c90a8'
branch_labels = None
depends_on = None


def upgrade():
    # For a new relationship between collaboration_membership and authorisation_group both collaboration_id values must
    # match.
    trigger = """
CREATE TRIGGER collaboration_memberships_authorisation_groups_collaboration_id
    BEFORE INSERT ON collaboration_memberships_authorisation_groups FOR EACH ROW
    BEGIN
        IF (SELECT collaboration_id FROM collaboration_memberships WHERE id = NEW.collaboration_membership_id) <>
        (SELECT collaboration_id FROM authorisation_groups WHERE id = NEW.authorisation_group_id)
        THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The collaboration ID must be equal for collaboration_memberships_authorisation_groups';
        END IF ;
    END;
"""
    trigger = re.sub(r"[\n\r\t]", "", trigger)
    conn = op.get_bind()
    conn.execute(text(trigger))


def downgrade():
    pass
