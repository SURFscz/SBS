from unittest import TestCase

from server.db.domain import Collaboration, Unit, OrganisationMembership


class TestCollaboration(TestCase):

    def test_valid_membership(self):
        organisation_membership = OrganisationMembership()
        collaboration = Collaboration()
        self.assertTrue(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        u1 = Unit(id=1)
        u2 = Unit(id=2)
        u3 = Unit(id=3)
        organisation_membership = OrganisationMembership(units=[u1])
        collaboration = Collaboration()
        self.assertFalse(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        organisation_membership = OrganisationMembership(units=[])
        collaboration = Collaboration(units=[u1, u2])
        self.assertTrue(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        collaboration = Collaboration(units=[u1, u2])
        organisation_membership = OrganisationMembership(units=[u1])
        self.assertTrue(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        organisation_membership = OrganisationMembership(units=[u1, u3])
        self.assertTrue(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        organisation_membership = OrganisationMembership(units=[u3])
        self.assertFalse(collaboration.is_allowed_unit_organisation_membership(organisation_membership))
