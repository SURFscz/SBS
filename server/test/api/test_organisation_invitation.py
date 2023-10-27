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
        self.assertTrue(len(organisation_invitation["organisation"]["organisation_memberships"]) > 0)

    def test_accept(self):
        self.login("urn:james")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)
        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual("admin", organisation_membership.role)
        self.assertEqual(0, len(organisation_membership.units))

    def test_accept_with_units(self):
        self.login("urn:james")
        organisation_invitation = OrganisationInvitation.query \
            .filter(OrganisationInvitation.hash == organisation_invitation_hash) \
            .one()
        organisation_invitation.intended_role = "manager"
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)
        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual(1, len(organisation_membership.units))

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
            self.put("/api/organisation_invitations/resend", body={"id": invitation_id, "message": "changed"})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["roger@example.org"], mail_msg.recipients)

    def test_resend_bulk(self):
        identifiers = []
        for invitation in OrganisationInvitation.query.all():
            identifiers.append({"id": invitation.id})
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/organisation_invitations/resend_bulk", body=identifiers)
            self.assertEqual(2, len(outbox))

    def test_resend_not_found(self):
        self.put("/api/organisation_invitations/resend", body={"id": "nope"}, response_status_code=404)

    def test_delete_not_found(self):
        self.delete("/api/organisation_invitations", primary_key="nope", response_status_code=404)
