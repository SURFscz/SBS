from sqlalchemy import text
from sqlalchemy.exc import DatabaseError

from server.db.db import db
from server.db.domain import Group, User
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_group, roger_name


class TestTriggers(AbstractTest):

    @staticmethod
    def _execute_statement(statement):
        sql = text(statement)
        with db.engine.connect() as conn:
            conn.execute(sql)

    def test_collaboration_memberships_groups_collaboration_id(self):
        try:
            group = self.find_entity_by_name(Group, ai_researchers_group)
            collaboration_membership = self.find_entity_by_name(User, roger_name).collaboration_memberships[0]

            self._execute_statement(f"insert into collaboration_memberships_groups "
                                    f"(collaboration_membership_id,group_id) "
                                    f"values ({collaboration_membership.id},{group.id})")
        except DatabaseError as err:
            self.assertEqual("The collaboration ID must be equal for collaboration_memberships_groups",
                             err.orig.args[1])
