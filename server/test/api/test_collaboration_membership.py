import time

from server.db.db import db
from server.db.domain import CollaborationMembership, User, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, user_sarah_name, co_research_name, co_teachers_name


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

    def test_delete_collaboration_membership_404(self):
        collaboration = self.find_entity_by_name(Collaboration, co_teachers_name)
        self.login("urn:john")
        self.delete("/api/collaboration_memberships", with_basic_auth=False,
                    primary_key=f"{collaboration.id}/9999999", response_status_code=404)

    def test_delete_collaboration_membership_me(self):
        self.login("urn:jane")
        collaboration_membership = CollaborationMembership.query.join(CollaborationMembership.user).filter(
            User.uid == "urn:jane").one()
        self.delete("/api/collaboration_memberships", with_basic_auth=False,
                    primary_key=f"{collaboration_membership.collaboration_id}/{collaboration_membership.user_id}")
        collaboration_memberships = CollaborationMembership.query.join(CollaborationMembership.user) \
            .filter(User.uid == "urn:jane").all()
        self.assertEqual(0, len(collaboration_memberships))

    def test_delete_collaboration_membership_not_allowed(self):
        self.login("urn:jane")
        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .join(CollaborationMembership.collaboration) \
            .filter(User.uid == "urn:sarah") \
            .filter(Collaboration.name == co_ai_computing_name) \
            .one()

        self.delete("/api/collaboration_memberships", with_basic_auth=False, response_status_code=403,
                    primary_key=f"{collaboration_membership.collaboration_id}/{collaboration_membership.user_id}")

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
        self.login("urn:mary")
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration_id = collaboration.id
        self.post("/api/collaboration_memberships",
                  body={"collaborationId": collaboration_id},
                  with_basic_auth=False)

        collaboration_membership = CollaborationMembership \
            .query \
            .join(CollaborationMembership.user) \
            .filter(User.uid == "urn:mary") \
            .filter(CollaborationMembership.collaboration_id == collaboration_id) \
            .one()
        self.assertEqual("admin", collaboration_membership.role)

    def test_create_collaboration_membership_auto_provisioning_group(self):
        self.login("urn:paul")
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        is_paul_member = [m.user for m in collaboration.groups[0].collaboration_memberships if m.user.uid == "urn:paul"]
        self.assertFalse(is_paul_member)

        self.post("/api/collaboration_memberships",
                  body={"collaborationId": collaboration.id},
                  with_basic_auth=False)
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        is_paul_member = [m.user for m in collaboration.groups[0].collaboration_memberships if m.user.uid == "urn:paul"]
        self.assertTrue(is_paul_member)

    def test_update_expiry_date(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        sarah = self.find_entity_by_name(User, user_sarah_name)
        memberships = sarah.collaboration_memberships
        membership_id = next(
            cm for cm in memberships if cm.user_id == sarah.id and cm.collaboration.id == collaboration_id).id
        self.put("/api/collaboration_memberships/expiry",
                 body={"collaboration_id": collaboration_id, "membership_id": membership_id,
                       "expiry_date": int(time.time())}, with_basic_auth=False)
        self.assertIsNotNone(db.session.get(CollaborationMembership, membership_id).expiry_date)

        self.put("/api/collaboration_memberships/expiry",
                 body={"collaboration_id": collaboration_id, "membership_id": membership_id,
                       "expiry_date": None}, with_basic_auth=False)
        self.assertIsNone(db.session.get(CollaborationMembership, membership_id).expiry_date)
