# -*- coding: future_fstrings -*-
from server.db.db import CollaborationMembership, User
from server.test.abstract_test import AbstractTest


class TestCollaborationMembership(AbstractTest):

    def test_delete_collaboration_membership(self):
        pre_count = CollaborationMembership.query.count()
        collaboration_membership = CollaborationMembership.query.join(CollaborationMembership.user).filter(
            User.uid == "urn:jane").one()
        self.delete("/api/collaboration_memberships",
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
