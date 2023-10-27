from server.db.domain import Organisation, User, OrganisationMembership
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestOrganisationMembership(AbstractTest):

    def test_delete_organisation_membership(self):
        self.login("urn:john")
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        user = self.find_entity_by_name(User, "Mary Doe")

        self.assertEqual(4, len(organisation.organisation_memberships))

        self.login("urn:mary")
        self.delete("/api/organisation_memberships", primary_key=f"{organisation.id}/{user.id}", )

        organisation = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(3, len(organisation.organisation_memberships))

    def test_delete_organisation_membership_not_allowed(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        user = self.find_entity_by_name(User, "Harry Doe")

        self.login("urn:roger")
        self.delete("/api/organisation_memberships", primary_key=f"{organisation.id}/{user.id}", with_basic_auth=False,
                    response_status_code=403)

    def test_delete_organisation_membership_me(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        user = self.find_entity_by_name(User, "Harry Doe")

        self.login("urn:harry")
        self.delete("/api/organisation_memberships", primary_key=f"{organisation.id}/{user.id}", with_basic_auth=False)

        organisation = self.find_entity_by_name(Organisation, uuc_name)
        harry_members = len(list(filter(lambda m: m.user.uid == "urn:harry", organisation.organisation_memberships)))
        self.assertEqual(0, harry_members)

    def test_update_organisation_membership(self):
        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:harry") \
            .one()
        self.assertEqual(1, len(organisation_membership.units))
        self.assertEqual("manager", organisation_membership.role)

        self.put("/api/organisation_memberships",
                 body={"organisationId": organisation_membership.organisation_id,
                       "userId": organisation_membership.user_id,
                       "role": "admin"})

        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:harry") \
            .one()
        self.assertEqual("admin", organisation_membership.role)
        self.assertEqual(0, len(organisation_membership.units))

    def test_update_organisation_membership_with_units(self):
        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:harry") \
            .one()
        self.assertEqual(1, len(organisation_membership.units))
        self.assertEqual("manager", organisation_membership.role)

        units = organisation_membership.organisation.units

        self.put("/api/organisation_memberships",
                 body={"organisationId": organisation_membership.organisation_id,
                       "userId": organisation_membership.user_id,
                       "role": "manager",
                       "units": [{"id": u.id, "name": u.name} for u in units]})

        organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .filter(User.uid == "urn:harry") \
            .one()
        self.assertEqual(2, len(organisation_membership.units))
        self.assertEqual("manager", organisation_membership.role)
