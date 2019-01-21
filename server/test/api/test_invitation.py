from server.db.db import Invitation
from server.test.abstract_test import AbstractTest
from server.test.seed import invitation_hash, ai_computing_name


class TestInvitation(AbstractTest):

    def test_find_by_hash(self):
        invitation = self.get("/api/invitations/find_by_hash",
                                           query_data={"hash": invitation_hash})
        self.assertEqual(invitation_hash, invitation["hash"])
        self.assertEqual(2, len(invitation["collaboration"]["collaboration_memberships"]))

    # Must be admin
    def test_find_by_id_forbidden(self):
        invitation_id = Invitation.query.one().id
        self.login("urn:peter")
        self.get(f"/api/invitations/{invitation_id}", with_basic_auth=False,
                 response_status_code=403)

    # Must be admin
    def test_find_by_id(self):
        invitation_id = Invitation.query.one().id
        self.login("urn:john")
        invitation = self.get(f"/api/invitations/{invitation_id}",
                                           with_basic_auth=False)
        self.assertEqual(ai_computing_name,
                         invitation["collaboration"]["name"])
