from server.db.domain import Group, Collaboration, User, CollaborationMembership
from server.test.abstract_test import AbstractTest
from server.test.seed import group_ai_researchers, co_ai_computing_name, user_boss_name


class TestGroupMembers(AbstractTest):

    def test_add_authorisation_group_members(self):
        authorisation_group = self.find_entity_by_name(Group, group_ai_researchers)
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        the_boss = self.find_entity_by_name(User, user_boss_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == the_boss.id).one()

        pre_count = len(authorisation_group.collaboration_memberships)
        self.login("urn:admin")
        self.put("/api/group_members", body={
            "group_id": authorisation_group.id,
            "collaboration_id": collaboration.id,
            "members_ids": [member.id]
        }, with_basic_auth=False)

        authorisation_group = self.find_entity_by_name(Group, group_ai_researchers)
        self.assertEqual(pre_count + 1, len(authorisation_group.collaboration_memberships))

    def test_add_authorisation_group_members_validation_error(self):
        self.login("urn:admin")
        self.put("/api/group_members", body={
            "group_id": 1,
            "collaboration_id": 1,
            "members_ids": ["nasty sql"]
        }, with_basic_auth=False, response_status_code=400)

    def test_delete_group_member(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        count = len(group.collaboration_memberships)
        collaboration_membership_id = group.collaboration_memberships[0].id
        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/group_members",
                    primary_key=f"{group.id}/"
                                f"{collaboration_membership_id}/"
                                f"{group.collaboration_id}")

        group = self.find_entity_by_name(Group, group_ai_researchers)
        count = len(group.collaboration_memberships)

        self.assertEqual(1, count)
