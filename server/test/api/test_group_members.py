# -*- coding: future_fstrings -*-
from server.db.db import Group
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_group


class TestGroupMembers(AbstractTest):

    def test_delete_all_group_members(self):
        group = self.find_entity_by_name(Group, ai_researchers_group)
        count = len(group.collaboration_memberships)

        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/group_members/delete_all_members",
                    primary_key=f"{group.id}/{group.collaboration_id}")

        group = self.find_entity_by_name(Group, ai_researchers_group)
        count = len(group.collaboration_memberships)

        self.assertEqual(0, count)

    def test_delete_group_member(self):
        group = self.find_entity_by_name(Group, ai_researchers_group)
        count = len(group.collaboration_memberships)
        collaboration_membership_id = group.collaboration_memberships[0].id
        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/group_members",
                    primary_key=f"{group.id}/"
                                f"{collaboration_membership_id}/"
                                f"{group.collaboration_id}")

        group = self.find_entity_by_name(Group, ai_researchers_group)
        count = len(group.collaboration_memberships)

        self.assertEqual(1, count)
