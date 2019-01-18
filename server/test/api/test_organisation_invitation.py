from server.test.abstract_test import AbstractTest
from server.test.seed import organisation_invitation_hash


class TestOrganisationInvitation(AbstractTest):

    def test_find_by_hash(self):
        organisation_invitation = self.get("/api/organisation_invitations/find_by_hash",
                                           query_data={"hash": organisation_invitation_hash})
        self.assertEqual(organisation_invitation_hash, organisation_invitation["hash"])
        membership = organisation_invitation["organisation"]["organisation_memberships"][0]
        self.assertEqual("admin", membership["role"])
        self.assertEqual("john@example.org", membership["user"]["email"])
