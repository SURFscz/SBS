from sqlalchemy import text

from server.cron.open_requests import open_requests
from server.cron.outstanding_requests import outstanding_requests
from server.db.db import db
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name


class TestOpenRequest(AbstractTest):

    def test_open_requests(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = open_requests(self.app)
            self.assertEqual(6, len(res))
            self.assertEqual(6, len(outbox))
