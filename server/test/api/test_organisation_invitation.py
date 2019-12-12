# -*- coding: future_fstrings -*-
from server.db.domain import OrganisationInvitation, OrganisationMembership, User
from server.test.abstract_test import AbstractTest
from server.test.seed import organisation_invitation_hash, organisation_invitation_expired_hash


class TestOrganisationInvitation(AbstractTest):

    @staticmethod
    def _invitation_by_hash(hash, require_one=True):
        query_filter = OrganisationInvitation.query.filter(OrganisationInvitation.hash == hash)
        return query_filter.one() if require_one else query_filter.all()

    def test_find_by_hash(self):
        organisation_invitation = self.get("/api/organisation_invitations/find_by_hash",
                                           query_data={"hash": organisation_invitation_hash})
        self.assertEqual(organisation_invitation_hash, organisation_invitation["hash"])
        membership = organisation_invitation["organisation"]["organisation_memberships"][0]
        self.assertEqual("admin", membership["role"])

    # Must be admin
    def test_find_by_id_forbidden(self):
        organisation_invitation_id = self._invitation_by_hash(organisation_invitation_hash).id
        self.login("urn:peter")
        self.get(f"/api/organisation_invitations/{organisation_invitation_id}", with_basic_auth=False,
                 response_status_code=403)

    # Must be admin
    def test_find_by_id(self):
        organisation_invitation_id = self._invitation_by_hash(organisation_invitation_hash).id
        self.login("urn:john")
        organisation_invitation = self.get(f"/api/organisation_invitations/{organisation_invitation_id}",
                                           with_basic_auth=False)
        self.assertEqual("urn:john",
                         organisation_invitation["organisation"]["organisation_memberships"][0]["user"]["uid"])

    def test_accept(self):
        self.login("urn:james")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)
        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual("admin", organisation_membership.role)

    def test_accept_already_member(self):
        self.login("urn:mary")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False,
                 response_status_code=409)

    def test_accept_expired(self):
        self.login("urn:james")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_expired_hash},
                 with_basic_auth=False,
                 response_status_code=409)

    def test_decline(self):
        self.login("urn:james")
        self.put("/api/organisation_invitations/decline", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)
        invitations = self._invitation_by_hash(organisation_invitation_hash, require_one=False)
        self.assertEqual(0, len(invitations))

    def test_delete(self):
        invitation_id = OrganisationInvitation.query.filter(
            OrganisationInvitation.hash == organisation_invitation_hash).one().id
        self.delete("/api/organisation_invitations", primary_key=invitation_id)
        invitations = self._invitation_by_hash(organisation_invitation_hash, require_one=False)
        self.assertEqual(0, len(invitations))

    def test_resend(self):
        invitation_id = self._invitation_by_hash(organisation_invitation_hash).id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/organisation_invitations/resend", body={"id": invitation_id})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["roger@example.org"], mail_msg.recipients)
