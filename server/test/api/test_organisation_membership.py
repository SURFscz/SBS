from server.db.db import Organisation, User
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestOrganisationMembership(AbstractTest):

    def test_delete_organisation_membership(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        user = self.find_entity_by_name(User, "Harry Doe")

        self.assertEqual(3, len(organisation.organisation_memberships))

        self.delete("/api/organisation_memberships", primary_key=f"{organisation.id}/{user.id}")

        organisation = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(2, len(organisation.organisation_memberships))
