# -*- coding: future_fstrings -*-
from server.db.domain import CollaborationMembership, User, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name


class TestCollaborationMembership(AbstractTest):

    def test_delete_collaboration_membership(self):
        self.login("urn:john")
        pre_count = CollaborationMembership.query.count()
        collaboration_membership = CollaborationMembership.query.join(CollaborationMembership.user).filter(
            User.uid == "urn:jane").one()
        self.delete("/api/collaboration_memberships", with_basic_auth=False,
                    primary_key=f"{collaboration_membership.collaboration_id}/{collaboration_membership.user_id}")
        post_count = CollaborationMembership.query.count()
        self.assertEqual(pre_count - 1, post_count)

    def test_update_collaboration_membership(self):
        collaboration_membership = CollaborationMembership.query.join(CollaborationMembership.user).filter(
            User.uid == "urn:jane").one()
        self.assertEqual("member", collaboration_membership.role)

        self.put("/api/collaboration_memberships",
                 body={"collaborationId": collaboration_membership.collaboration_id,
                       "userId": collaboration_membership.user_id, "role": "admin"})

        collaboration_membership = CollaborationMembership.query.join(CollaborationMembership.user).filter(
            User.uid == "urn:jane").one()
        self.assertEqual("admin", collaboration_membership.role)

    def test_create_collaboration_membership(self):
        self.login("urn:harry")
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.post("/api/collaboration_memberships",
                  body={"collaborationId": collaboration.id},
                  with_basic_auth=False)

        collaboration_membership = CollaborationMembership \
            .query \
            .join(CollaborationMembership.user) \
            .filter(User.uid == "urn:harry") \
            .filter(CollaborationMembership.collaboration_id == collaboration.id) \
            .one()
        self.assertEqual("admin", collaboration_membership.role)
