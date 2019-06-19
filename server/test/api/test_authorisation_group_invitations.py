# -*- coding: future_fstrings -*-
from server.db.db import AuthorisationGroup, Collaboration, Invitation
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, ai_computing_name, invitation_hash_curious


class TestAuthorisationGroupInvitations(AbstractTest):

    def test_add_authorisation_group_invitation(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one()

        self.put("/api/authorisation_group_invitations", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": collaboration.id,
            "invitations_ids": [invitation.id]
        })

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

        self.assertEqual(1, len(authorisation_group.invitations))

    def test_delete_authorisation_group_invitation(self):
        self.test_add_authorisation_group_invitation()
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one()

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

        self.delete("/api/authorisation_group_invitations",
                    primary_key=f"{authorisation_group.id}/"
                    f"{invitation.id}/"
                    f"{authorisation_group.collaboration_id}")

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        self.assertEqual(0, len(authorisation_group.invitations))
