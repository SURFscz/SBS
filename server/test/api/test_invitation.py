from server.db.db import Invitation
from server.test.abstract_test import AbstractTest
from server.test.seed import invitation_hash_no_way, ai_computing_name, invitation_hash_curious


class TestInvitation(AbstractTest):

    @staticmethod
    def _invitation_id_by_hash(hash):
        return Invitation.query.filter(Invitation.hash == hash).one().id

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
