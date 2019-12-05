from server.db.db import Organisation, CollaborationRequest, CollaborationMembership
from server.test.abstract_test import AbstractTest
from server.test.seed import schac_home_organisation, amsterdam_uva_name, collaboration_request_name


class TestCollaborationRequest(AbstractTest):

    def test_request_collaboration(self):
        organisation = self.find_entity_by_name(Organisation, amsterdam_uva_name)
        self.login("urn:roger", schac_home_organisation)
        data = {
            "name": "New Collaboration",
            "short_name": "new_collaboration_short",
            "message": "pretty please",
            "organisation_id": organisation.id
        }
        with self.app.mail.record_messages() as outbox:
            res = self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            collaboration_request = CollaborationRequest.query.get(res["id"])
            self.assertEqual("urn:roger", collaboration_request.requester.uid)
            mail_msg = outbox[0]
            self.assertEqual("Request for new collaboration New Collaboration", mail_msg.subject)

    def test_request_collaboration_approve(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)

        with self.app.mail.record_messages() as outbox:
            self.login("urn:harry")
            res = self.put(f"/api/collaboration_requests/approve/{collaboration_request.id}", with_basic_auth=False)

            deleted = CollaborationRequest.query.filter(CollaborationRequest.name == collaboration_request_name).all()
            self.assertEqual(0, len(deleted))

            members = CollaborationMembership.query.filter(CollaborationMembership.collaboration_id == res["id"]).all()
            self.assertEqual(1, len(members))

            membership = members[0]
            self.assertEqual("admin", membership.role)
            self.assertEqual(collaboration_request.requester.uid, membership.user.uid)

            mail_msg = outbox[0]
            self.assertEqual("Collaboration request for collaboration New Collaboration has been accepted",
                             mail_msg.subject)

    def test_request_collaboration_deny(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)

        with self.app.mail.record_messages() as outbox:
            self.login("urn:harry")
            self.put(f"/api/collaboration_requests/deny/{collaboration_request.id}", with_basic_auth=False)

            deleted = CollaborationRequest.query.filter(CollaborationRequest.name == collaboration_request_name).all()
            self.assertEqual(0, len(deleted))

            mail_msg = outbox[0]
            self.assertEqual("Collaboration request for collaboration New Collaboration has been declined",
                             mail_msg.subject)
