from server.db.db import OrganisationInvitation
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

    # Must be admin
    def test_find_by_id_forbidden(self):
        organisation_invitation_id = OrganisationInvitation.query.one().id
        self.login("urn:peter")
        self.get(f"/api/organisation_invitations/{organisation_invitation_id}", with_basic_auth=False,
                 response_status_code=403)

    # Must be admin
    def test_find_by_id(self):
        organisation_invitation_id = OrganisationInvitation.query.one().id
        self.login("urn:john")
        organisation_invitation = self.get(f"/api/organisation_invitations/{organisation_invitation_id}",
                                           with_basic_auth=False)
        self.assertEqual("urn:john",
                         organisation_invitation["organisation"]["organisation_memberships"][0]["user"]["uid"])
