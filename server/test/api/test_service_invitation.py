from server.db.domain import ServiceInvitation, ServiceMembership, User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_invitation_hash, service_invitation_expired_hash


class TestServiceInvitation(AbstractTest):

    @staticmethod
    def _invitation_by_hash(hash, require_one=True):
        query_filter = ServiceInvitation.query.filter(ServiceInvitation.hash == hash)
        return query_filter.one() if require_one else query_filter.all()

    def test_find_by_hash(self):
        service_invitation = self.get("/api/service_invitations/find_by_hash",
                                      query_data={"hash": service_invitation_hash})
        self.assertEqual(service_invitation_hash, service_invitation["hash"])
        self.assertTrue(len(service_invitation["service"]["service_memberships"]) > 0)

    def test_find_by_hash_unauthorized(self):
        service_invitation = self.get("/api/service_invitations/find_by_hash",
                                      query_data={"hash": service_invitation_hash},
                                      with_basic_auth=False)
        self.assertEqual(service_invitation_hash, service_invitation["hash"])

    def test_accept(self):
        self.login("urn:paul")
        self.put("/api/service_invitations/accept", body={"hash": service_invitation_hash},
                 with_basic_auth=False)
        service_membership = ServiceMembership.query \
            .join(ServiceMembership.user) \
            .filter(User.uid == "urn:paul") \
            .one()
        self.assertEqual("admin", service_membership.role)

    def test_accept_already_member(self):
        self.login("urn:james")
        self.put("/api/service_invitations/accept", body={"hash": service_invitation_hash},
                 with_basic_auth=False,
                 response_status_code=409)

    def test_accept_expired(self):
        self.login("urn:james")
        self.put("/api/service_invitations/accept", body={"hash": service_invitation_expired_hash},
                 with_basic_auth=False,
                 response_status_code=409)

    def test_decline(self):
        self.login("urn:james")
        self.put("/api/service_invitations/decline", body={"hash": service_invitation_hash},
                 with_basic_auth=False)
        invitations = self._invitation_by_hash(service_invitation_hash, require_one=False)
        self.assertEqual(0, len(invitations))

    def test_delete(self):
        invitation_id = ServiceInvitation.query.filter(
            ServiceInvitation.hash == service_invitation_hash).one().id
        self.delete("/api/service_invitations", primary_key=invitation_id)
        invitations = self._invitation_by_hash(service_invitation_hash, require_one=False)
        self.assertEqual(0, len(invitations))

    def test_resend(self):
        invitation_id = self._invitation_by_hash(service_invitation_hash).id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/service_invitations/resend", body={"id": invitation_id, "message": "changed"})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["admin@cloud.org"], mail_msg.recipients)

    def test_resend_bulk(self):
        identifiers = []
        for invitation in ServiceInvitation.query.all():
            identifiers.append({"id": invitation.id})
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/service_invitations/resend_bulk", body=identifiers)
            self.assertEqual(2, len(outbox))

    def test_resend_not_found(self):
        self.put("/api/service_invitations/resend", body={"id": "nope"}, response_status_code=404)

    def test_delete_not_found(self):
        self.delete("/api/service_invitations", primary_key="nope", response_status_code=404)
