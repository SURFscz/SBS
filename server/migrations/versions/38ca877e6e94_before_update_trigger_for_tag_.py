"""before update trigger for tag consistency

Revision ID: 38ca877e6e94
Revises: d3dab70506fe
Create Date: 2024-04-30 16:01:35.728061

"""
import re

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '38ca877e6e94'
down_revision = 'd3dab70506fe'
branch_labels = None
depends_on = None


def upgrade():
    # For a new relationship between collaboration and tag group both organisation_id values must
    # match.
    trigger = """
    CREATE TRIGGER collaboration_organisation_id_tags_before_update
        BEFORE UPDATE ON collaboration_tags FOR EACH ROW
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
