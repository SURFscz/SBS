# -*- coding: future_fstrings -*-

from server.db.domain import Collaboration, Invitation, OrganisationInvitation
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name


class TestModels(AbstractTest):

    def test_collaboration(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(False, collaboration.is_admin(999))

    def test_invitation_role(self):
        Invitation.validate_role("admin")
        Invitation.validate_role("member")

        def invalid_role():
            Invitation.validate_role("nope")

        self.assertRaises(ValueError, invalid_role)

    def test_organisation_invitation_role(self):
        OrganisationInvitation.validate_role("admin")
        OrganisationInvitation.validate_role("manager")

        def invalid_role():
            OrganisationInvitation.validate_role("nope")

        self.assertRaises(ValueError, invalid_role)
