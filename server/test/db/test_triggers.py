from sqlalchemy import text
from sqlalchemy.exc import DatabaseError

from server.db.db import db
from server.db.domain import Group, User, Collaboration, Tag
from server.test.abstract_test import AbstractTest
from server.test.seed import group_ai_researchers, user_roger_name, co_ai_computing_name


class TestTriggers(AbstractTest):

    @staticmethod
    def _execute_statement(statement):
        sql = text(statement)
        with db.engine.connect() as conn:
            conn.execute(sql)

    def test_collaboration_memberships_groups_collaboration_id(self):
        try:
            group = self.find_entity_by_name(Group, group_ai_researchers)
            collaboration_membership = self.find_entity_by_name(User, user_roger_name).collaboration_memberships[0]

            self._execute_statement(f"insert into collaboration_memberships_groups "
                                    f"(collaboration_membership_id,group_id) "
                                    f"values ({collaboration_membership.id},{group.id})")
            self.fail("Expected database error")
        except DatabaseError as err:
            self.assertEqual("The collaboration ID must be equal for collaboration_memberships_groups",
                             err.orig.args[1])

    def test_collaboration_organisation_id_tags(self):
        try:
            # co_ai_computing_name belongs to organisation uuc
            collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
            # tag_ufra belongs to organisation ufra
            tag_ufra = Tag.query.filter(Tag.tag_value == "tag_ufra")[0]
            self._execute_statement(f"insert into collaboration_tags "
                                    f"(collaboration_id, tag_id) "
                                    f"values ({collaboration.id},{tag_ufra.id})")
            self.fail("Expected database error")
        except DatabaseError as err:
            self.assertEqual("The collaboration must be part of the organisation",
                             err.orig.args[1])
