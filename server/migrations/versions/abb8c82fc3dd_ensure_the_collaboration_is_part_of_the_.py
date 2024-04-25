"""ensure the collaboration is part of the correct organisation for tags

Revision ID: abb8c82fc3dd
Revises: c1c47d346e3f
Create Date: 2024-04-25 09:26:54.609289

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'abb8c82fc3dd'
down_revision = 'c1c47d346e3f'
branch_labels = None
depends_on = None


def upgrade():
    # For a new relationship between collaboration_membership and group both collaboration_id values must
    # match.
    trigger = """
    CREATE TRIGGER collaboration_organisation_id_tags
        BEFORE INSERT ON collaboration_tags FOR EACH ROW
        BEGIN
            IF (SELECT c.organisation_id FROM collaborations c WHERE c.id = NEW.collaboration_id)
             <>
            (SELECT t.organisation_id FROM `tags` t WHERE t.id = NEW.tag_id)
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'The collaboration must be part of the organisation';
            END IF ;
        END;
    """
    trigger = re.sub(r"[\n\r\t]", "", trigger)
    conn = op.get_bind()
    conn.execute(text(trigger))


def downgrade():
    pass
