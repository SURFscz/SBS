from server.db.db import Organisation, CollaborationRequest
from server.test.abstract_test import AbstractTest
from server.test.seed import schac_home_organisation, amsterdam_uva_name


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
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            collaboration_request = CollaborationRequest.query.get(res["id"])
            self.assertEqual("urn:roger", collaboration_request.requester.uid)
            mail_msg = outbox[0]
            self.assertEqual("Request for new collaboration New Collaboration", mail_msg.subject)
