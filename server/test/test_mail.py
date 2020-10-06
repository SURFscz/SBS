# -*- coding: future_fstrings -*-
import os

from server.db.domain import Collaboration
from server.mail import mail_collaboration_join_request
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_uva_researcher_uuid, collaboration_ai_computing_uuid


class TestMail(AbstractTest):

    def test_send_join_request_mail(self):
        collaboration = Collaboration.query \
            .filter(Collaboration.identifier == collaboration_uva_researcher_uuid).one()
        join_request = {"message": "please", "hash": 1}
        mail = self.app.mail
        with mail.record_messages() as outbox:
            context = {"salutation": "Dear",
                       "collaboration": collaboration,
                       "user": "John Doe",
                       "base_url": "http://localhost:300",
                       "join_request": join_request}
            mail_collaboration_join_request(context, collaboration, ["test@example.com"])
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["test@example.com"], mail_msg.recipients)
            self.assertEqual("SURF_ResearchAccessManagement <no-reply@surf.nl>", mail_msg.sender)
            self.assertTrue(f"http://localhost:300/join-requests/{join_request['hash']}" in mail_msg.html)

    def test_send_error_mail(self):
        try:
            del os.environ["TESTING"]
            mail = self.app.mail
            with mail.record_messages() as outbox:
                self.login("urn:mary")
                self.get("/api/collaborations/members", query_data={"identifier": collaboration_ai_computing_uuid},
                         response_status_code=403, with_basic_auth=False)
                self.assertEqual(1, len(outbox))
                mail_msg = outbox[0]
                self.assertTrue("Forbidden()" in mail_msg.html)
                self.assertTrue("An error occurred in local" in mail_msg.html)
        finally:
            os.environ["TESTING"] = "1"
