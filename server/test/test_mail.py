from server.db.db import Collaboration
from server.mail import mail_collaboration_join_request
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_uva_researcher_uuid


class TestMail(AbstractTest):

    def test_send_join_request_mail(self):
        collaboration = Collaboration.query \
            .filter(Collaboration.identifier == collaboration_uva_researcher_uuid).one()
        join_request = {"message": "please"}
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
            self.assertTrue(f"http://localhost:300/collaborations/{collaboration.id}" in mail_msg.html)
