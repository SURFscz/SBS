from sqlalchemy.orm import joinedload

from server.db.db import JoinRequest, User, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_ai_computing_uuid


class TestJoinRequest(AbstractTest):

    @staticmethod
    def _join_request_by_user(uid):
        return User.query.options(joinedload(User.join_requests)).filter(User.uid == uid).one().join_requests[0]

    def test_new_join_request(self):
        collaboration_id = Collaboration.query \
            .filter(Collaboration.identifier == collaboration_ai_computing_uuid).one().id
        self.login("urn:mary")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            join_request = self.post("/api/join_requests",
                                     body={"collaborationId": collaboration_id, "motivation": "please"},
                                     with_basic_auth=False)
            self.assertIsNotNone(join_request["id"])
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["boss@example.org"], mail_msg.recipients)
            self.assertTrue(f"http://localhost:3000/collaborations/{collaboration_id}" in mail_msg.html)

    def test_join_request_delete(self):
        self.assertEqual(3, JoinRequest.query.count())
        join_request_id = self._join_request_by_user("urn:peter").id
        self.login("urn:admin")
        self.delete("/api/join_requests", primary_key=join_request_id)
        self.assertEqual(2, JoinRequest.query.count())

    def test_join_request_delete_no_access(self):
        join_request_id = self._join_request_by_user("urn:mary").id
        self.login("urn:peter")
        response = self.client.delete(f"/api/join_requests/{join_request_id}")
        self.assertEqual(403, response.status_code)

    def test_accept_join_request(self):
        join_request_id = self._join_request_by_user("urn:peter").id
        self.login("urn:admin")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/join_requests/accept", body={"id": join_request_id})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["peter@example.org"], mail_msg.recipients)
            self.assertTrue("has been <strong>accepted</strong>" in mail_msg.html)
            self.assertEqual(2, JoinRequest.query.count())

    def test_accept_join_request_already_member(self):
        join_request_id = self._join_request_by_user("urn:john").id
        self.login("urn:admin")
        self.put("/api/join_requests/accept", body={"id": join_request_id}, response_status_code=409)

    def test_decline_join_request(self):
        join_request_id = self._join_request_by_user("urn:peter").id
        self.login("urn:admin")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/join_requests/decline", body={"id": join_request_id})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["peter@example.org"], mail_msg.recipients)
            self.assertTrue("has been <strong>declined</strong>" in mail_msg.html)
            self.assertEqual(2, JoinRequest.query.count())

    def test_join_request_by_id(self):
        join_request_id = self._join_request_by_user("urn:peter").id
        self.login("urn:peter")
        join_request = self.get(f"/api/join_requests/{join_request_id}")
        self.assertEqual("urn:peter", join_request["user"]["uid"])
