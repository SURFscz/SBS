# -*- coding: future_fstrings -*-
from server.db.db import Invitation, CollaborationMembership, User, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import invitation_hash_no_way, ai_computing_name, invitation_hash_curious, invitation_hash_uva, \
    uva_research_name


class TestInvitation(AbstractTest):

    @staticmethod
    def _invitation_id_by_hash(hash_value):
        return Invitation.query.filter(Invitation.hash == hash_value).one().id

    def test_find_by_hash(self):
        invitation = self.get("/api/invitations/find_by_hash",
                              query_data={"hash": invitation_hash_no_way})
        self.assertEqual(invitation_hash_no_way, invitation["hash"])
        self.assertTrue(len(invitation["collaboration"]["collaboration_memberships"]) > 0)

    # Must be admin
    def test_find_by_id_forbidden(self):
        invitation_id = self._invitation_id_by_hash(invitation_hash_curious)
        self.login("urn:peter")
        self.get(f"/api/invitations/{invitation_id}", with_basic_auth=False,
                 response_status_code=403)

    # Must be admin
    def test_find_by_id(self):
        invitation_id = self._invitation_id_by_hash(invitation_hash_curious)
        self.login("urn:john")
        invitation = self.get(f"/api/invitations/{invitation_id}",
                              with_basic_auth=False)
        self.assertEqual(ai_computing_name,
                         invitation["collaboration"]["name"])

    def test_find_by_id_with_authorisation_groups(self):
        invitation_id = self._invitation_id_by_hash(invitation_hash_uva)
        self.login("urn:john")
        invitation = self.get(f"/api/invitations/{invitation_id}", with_basic_auth=False)
        self.assertEqual(1, len(invitation["groups"]))

    def test_accept(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual("admin", collaboration_membership.role)

    def test_accept_with_authorisation_group_invitations(self):
        self.login("urn:jane")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_uva}, with_basic_auth=False)

        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .join(CollaborationMembership.collaboration) \
            .filter(User.uid == "urn:jane") \
            .filter(Collaboration.name == uva_research_name) \
            .one()
        self.assertEqual("member", collaboration_membership.role)

    def test_accept_already_member(self):
        self.login("urn:jane")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)

    def test_accept_expired(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_no_way}, with_basic_auth=False,
                 response_status_code=409)

    def test_decline(self):
        self.login("urn:james")
        self.put("/api/invitations/decline", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        invitations = Invitation.query.filter(Invitation.hash == invitation_hash_curious).all()
        self.assertEqual(0, len(invitations))

    def test_delete(self):
        invitation_id = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one().id
        self.delete("/api/invitations", primary_key=invitation_id)
        invitations = Invitation.query.filter(Invitation.hash == invitation_hash_curious).all()
        self.assertEqual(0, len(invitations))

    def test_resend(self):
        invitation_id = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one().id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/invitations/resend", body={"id": invitation_id})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["curious@ex.org"], mail_msg.recipients)
            self.assertTrue("http://localhost:3000/invitations/accept/" in mail_msg.html)
