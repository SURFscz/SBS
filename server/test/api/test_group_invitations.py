# -*- coding: future_fstrings -*-
from server.db.domain import Group, Collaboration, Invitation
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_group, ai_computing_name, invitation_hash_curious


class TestGroupInvitations(AbstractTest):

    def test_add_group_invitation(self):
        group = self.find_entity_by_name(Group, ai_researchers_group)
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one()

        self.put("/api/group_invitations", body={
            "group_id": group.id,
            "collaboration_id": collaboration.id,
            "invitations_ids": [invitation.id]
        })

        group = self.find_entity_by_name(Group, ai_researchers_group)

        self.assertEqual(1, len(group.invitations))

    def test_delete_group_invitation(self):
        self.test_add_group_invitation()
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one()

        group = self.find_entity_by_name(Group, ai_researchers_group)

        self.delete("/api/group_invitations",
                    primary_key=f"{group.id}/"
                    f"{invitation.id}/"
                    f"{group.collaboration_id}")

        group = self.find_entity_by_name(Group, ai_researchers_group)
        self.assertEqual(0, len(group.invitations))
