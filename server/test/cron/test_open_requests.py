from server.cron.open_requests import open_requests
from server.test.abstract_test import AbstractTest


class TestOpenRequest(AbstractTest):

    def test_open_requests(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = open_requests(self.app)
            self.assertEqual(6, len(res))
            self.assertEqual(6, len(outbox))
