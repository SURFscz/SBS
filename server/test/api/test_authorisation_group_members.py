from server.db.db import AuthorisationGroup, Collaboration, CollaborationMembership, User, UserServiceProfile
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, ai_computing_name, the_boss_name


class TestAuthorisationGroupMembers(AbstractTest):

    def test_add_authorisation_group_members(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        the_boss = self.find_entity_by_name(User, the_boss_name)
        member = CollaborationMembership.query.filter(CollaborationMembership.user_id == the_boss.id).one()

        count = UserServiceProfile.query.filter(UserServiceProfile.user_id == member.user_id).count()
        self.assertEqual(0, count)

        self.login("urn:admin")
        self.put("/api/authorisation_group_members", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": collaboration.id,
            "members_ids": [member.id]
        }, with_basic_auth=False)

        user_service_profile = UserServiceProfile.query \
            .filter(UserServiceProfile.user_id == member.user_id) \
            .one()
        self.assertEqual(the_boss.name, user_service_profile.user.name)

    def test_delete_all_authorisation_group_members(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        count = len(authorisation_group.collaboration_memberships)

        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/authorisation_group_members/delete_all_members",
                    primary_key=f"{authorisation_group.id}/{authorisation_group.collaboration_id}")

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        count = len(authorisation_group.collaboration_memberships)

        self.assertEqual(0, count)

    def test_delete_authorisation_group_member(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        count = len(authorisation_group.collaboration_memberships)
        collaboration_membership_id = authorisation_group.collaboration_memberships[0].id
        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/authorisation_group_members",
                    primary_key=f"{authorisation_group.id}/"
                    f"{collaboration_membership_id}/"
                    f"{authorisation_group.collaboration_id}")

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        count = len(authorisation_group.collaboration_memberships)

        self.assertEqual(1, count)

    def test_pre_flight(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        collaboration_membership_id = authorisation_group.collaboration_memberships[0].id

        user_service_profiles = self.get("/api/authorisation_group_members/delete_pre_flight",
                                         query_data={"authorisation_group_id": authorisation_group.id,
                                                     "collaboration_membership_id": collaboration_membership_id,
                                                     "collaboration_id": authorisation_group.collaboration_id})
        self.assertEqual(1, len(user_service_profiles))
        self.assertEqual("urn:john", user_service_profiles[0]["user"]["uid"])
