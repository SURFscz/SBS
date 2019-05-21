# -*- coding: future_fstrings -*-
"""trigger_service_authorisation_group

Revision ID: 9870b723a53c
Revises: 1e694ddc996d
Create Date: 2019-02-21 14:57:29.602871

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '9870b723a53c'
down_revision = '1e694ddc996d'
branch_labels = None
depends_on = None


def upgrade():
    # For a new relationship service - authorisation_group there must be a relationship between the collaboration of
    # the authorisation_group and service
    trigger = """
    CREATE TRIGGER services_authorisation_groups_collaboration
        BEFORE INSERT ON services_authorisation_groups FOR EACH ROW
        BEGIN
            IF (SELECT COUNT(*) FROM services_collaborations WHERE collaboration_id =
            (SELECT collaboration_id FROM authorisation_groups WHERE id = NEW.authorisation_group_id) AND
            service_id = NEW.service_id) < 1
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Service must be linked to collaboration';
            END IF ;
        END;
    """
    trigger = re.sub(r"[\n\r\t]", "", trigger)
    conn = op.get_bind()
    conn.execute(text(trigger))


def downgrade():
    pass
