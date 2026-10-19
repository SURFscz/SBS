from server.db.domain import Group, Collaboration, User, CollaborationMembership
from server.test.abstract_test import AbstractTest
from server.test.seed import group_ai_researchers, co_ai_computing_name, user_boss_name, co_research_name, user_john_name


class TestGroupMembers(AbstractTest):

    def test_add_group_members(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        # group_ai_researchers is part of the co_ai_computing_name, see server/test/seed.py#715
        group = self.find_entity_by_name(Group, group_ai_researchers)
        # the_boss is a member of the co (#671) but not of the group (#716)
        the_boss = self.find_entity_by_name(User, user_boss_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == the_boss.id).one()

        pre_count = len(group.collaboration_memberships)
        self.login("urn:admin")
        self.put("/api/group_members", body={
            "group_id": group.id,
            "collaboration_id": collaboration.id,
            "members_ids": [member.id]
        }, with_basic_auth=False)

        group = self.find_entity_by_name(Group, group_ai_researchers)
        self.assertEqual(pre_count + 1, len(group.collaboration_memberships))

    def test_add_group_members_forbidden(self):
        # Find the Research CO
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        # Find the AI Researchers group, which is part of the AI Computing CO, NOT the Research CO
        group = self.find_entity_by_name(Group, group_ai_researchers)
        # The Boss is a member of the AI Computing CO, not yet a member of the AI Researchers group
        the_boss = self.find_entity_by_name(User, user_boss_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == the_boss.id).one()

        # Sarah is the admin of the Research CO, but only a member of the AI Computing CO,
        # so adding participants to the AI Researchers group should not be possible
        self.login("urn:sarah")
        self.put("/api/group_members", body={
            "group_id": group.id,
            "collaboration_id": collaboration.id,
            "members_ids": [member.id]
        }, with_basic_auth=False, response_status_code=403)

    def test_add_group_members_validation_error(self):
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

    def test_delete_group_members_forbidden(self):
        # Find the Research CO
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        # Find the AI Researchers group, which is part of the AI Computing CO, NOT the Research CO
        group = self.find_entity_by_name(Group, group_ai_researchers)
        # John is a member of the AI Researchers group
        john = self.find_entity_by_name(User, user_john_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == john.id).one()

        # Sarah is the admin of the Research CO, but only a member of the AI Computing CO,
        # so deleting participants from the AI Researchers group should not be possible
        self.login("urn:sarah")
        self.delete("/api/group_members",
                    primary_key=f"{group.id}/"
                                f"{member.id}/"
                                f"{collaboration.id}",
                    with_basic_auth=False, response_status_code=403)
