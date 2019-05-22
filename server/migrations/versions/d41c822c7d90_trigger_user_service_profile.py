# -*- coding: future_fstrings -*-
"""trigger_user_service_profile

Revision ID: d41c822c7d90
Revises: 9870b723a53c
Create Date: 2019-02-21 14:57:59.542072

"""
import re

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd41c822c7d90'
down_revision = '9870b723a53c'
branch_labels = None
depends_on = None


def upgrade():
    # For a new user_service_profile the collaboration of the authorisation_group must equal the
    # collaboration of the collaboration_membership linked to the user and the service
    # must be linked to the authorisation and the collaboration
    trigger = """
    CREATE TRIGGER user_service_profile_collaboration_membership
        BEFORE INSERT ON user_service_profiles FOR EACH ROW
        BEGIN
            DECLARE main_collaboration_id INTEGER;

            SET main_collaboration_id := (SELECT id FROM collaborations WHERE id =
                (SELECT collaboration_id FROM authorisation_groups WHERE id = NEW.authorisation_group_id));

            IF (SELECT COUNT(*) FROM services_collaborations
                WHERE collaboration_id = main_collaboration_id
                AND service_id = NEW.service_id) < 1
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'UserServiceProfile service is not linked to collaboration';
            END IF;

            IF (SELECT COUNT(*) FROM services_authorisation_groups WHERE
                authorisation_group_id = NEW.authorisation_group_id AND service_id = NEW.service_id) < 1
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'UserServiceProfile authorisation_group is not linked to service';
            END IF;

            IF (SELECT COUNT(*) FROM collaboration_memberships_authorisation_groups WHERE
                authorisation_group_id = NEW.authorisation_group_id AND collaboration_membership_id IN
                    (SELECT id FROM collaboration_memberships WHERE collaboration_id = main_collaboration_id AND
                    user_id = NEW.user_id)) < 1
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'UserServiceProfile authorisation_group is not linked to collaboration__membership';
            END IF;
        END;
    """
    trigger = re.sub(r"[\n\r\t]", "", trigger)
    conn = op.get_bind()
    conn.execute(text(trigger))


def downgrade():
    pass
