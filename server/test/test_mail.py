import json
import os

from server.auth.security import CSRF_TOKEN
from server.db.domain import Collaboration, User
from server.mail import mail_collaboration_join_request
from server.test.abstract_test import AbstractTest
from server.test.seed import co_research_uuid, unihard_secret


class TestMail(AbstractTest):

    def test_send_join_request_mail(self):
        collaboration = Collaboration.query \
            .filter(Collaboration.identifier == co_research_uuid).one()
        join_request = {"message": "please", "hash": 1}
        mail = self.app.mail
        context = {"salutation": "Dear",
                   "collaboration": collaboration,
                   "user": User.query.filter(User.uid == "urn:john").one(),
                   "base_url": "http://localhost:300",
                   "join_request": join_request}
        mail_collaboration_join_request(context, collaboration, ["test@example.com"])
        self.assertEqual(1, len(mail.outbox))
        mail_msg = mail.outbox[0]
        self.assertListEqual(["test@example.com"], mail_msg.to)
        self.assertEqual("SURF_ResearchAccessManagement <no-reply@surf.nl>", mail_msg.from_email)
        self.assertTrue(f"http://localhost:300/collaborations/{collaboration.id}/joinrequests" in mail_msg.body)

    def test_send_error_mail(self):
        try:
            self.app.app_config.mail.send_exceptions = True
            mail = self.app.mail
            self.login("urn:john")
            me = self.get("/api/users/me")
            group_name = "new_auth_group"
            # del os.environ["TESTING"]
            self.post("/api/groups/",
                      body={
                          "name": group_name,
                          "short_name": group_name,
                          "description": "des",
                          "auto_provision_members": False,
                          "collaboration_id": "nope",
                      },
                      headers={CSRF_TOKEN: me[CSRF_TOKEN]},
                      response_status_code=400,
                      with_basic_auth=False)
            self.assertEqual(1, len(mail.outbox))
            body = mail.outbox[0].body
            self.assertTrue("An error occurred in local" in body)
        finally:
            os.environ["TESTING"] = "1"
            self.app.app_config.mail.send_exceptions = False

    def test_no_error_mail_for_api(self):
        try:
            self.app.app_config.mail.send_exceptions = True
            mail = self.app.mail
            del os.environ["TESTING"]
            self.client.post("/api/collaborations/v1",
                             headers={"Authorization": f"Bearer {unihard_secret}"},
                             data=json.dumps({}),
                             content_type="application/json")

            self.assertIsNone(mail.outbox)

        finally:
            os.environ["TESTING"] = "1"
            self.app.app_config.mail.send_exceptions = False

    def test_send_audit_trail_mail(self):
        try:
            self.app.app_config.mail.audit_trail_notifications_enabled = True
            mail = self.app.mail
            self.login("urn:john")
            me = self.get("/api/users/me")
            self.post("/api/organisations",
                      body={"name": "new_organisation",
                            "short_name": "https://ti1"},
                      headers={CSRF_TOKEN: me[CSRF_TOKEN]},
                      with_basic_auth=False)
            self.assertEqual(1, len(mail.outbox))
            mail_msg = mail.outbox[0]
            alternatives_ = mail_msg.alternatives[0][0]
            self.assertTrue("<p>User John Doe has created a(n) Organisation"
                            " on environment <strong>local</strong>" in alternatives_)
        finally:
            self.app.app_config.mail.audit_trail_notifications_enabled = False
