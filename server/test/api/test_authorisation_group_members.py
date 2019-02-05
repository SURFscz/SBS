from server.db.db import AuthorisationGroup, Collaboration, CollaborationMembership, User, UserServiceProfile
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, ai_computing_name, the_boss_name


class TestAuthorisationGroupMembers(AbstractTest):

    def test_add_authorisation_group_members(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        the_boss = self.find_entity_by_name(User, the_boss_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == the_boss.id).one()

        count = UserServiceProfile.query.filter(UserServiceProfile.collaboration_membership_id == member.id).count()
        self.assertEqual(0, count)

        self.login("urn:admin")
        self.put("/api/authorisation_group_members", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": collaboration.id,
            "members_ids": [member.id]
        }, with_basic_auth=False)
        user_service_profile = UserServiceProfile.query.filter(
            UserServiceProfile.collaboration_membership_id == member.id).one()
        self.assertEqual(the_boss.name, user_service_profile.collaboration_membership.user.name)
