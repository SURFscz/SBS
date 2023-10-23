from unittest import TestCase

from server.db.domain import Collaboration, Unit, OrganisationMembership


class TestCollaboration(TestCase):

    def test_valid_membership(self):
        u1 = Unit(id=1)
        u2 = Unit(id=2)
        collaboration = Collaboration(units=[u1, u2])
        organisation_membership = OrganisationMembership(units=[u1])
        self.assertFalse(collaboration.is_allowed_unit_organisation_membership(organisation_membership))

        organisation_membership = OrganisationMembership(units=[u1, u2])
        self.assertTrue(collaboration.is_allowed_unit_organisation_membership(organisation_membership))
