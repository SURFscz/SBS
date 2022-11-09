
from server.cron.outstanding_requests import outstanding_requests
from server.db.db import db
from server.test.abstract_test import AbstractTest


class TestOutstandingRequests(AbstractTest):

    def test_outstanding_requests(self):
        # Ensure we have results
        past_date = "2018-03-20 14:51:40"
        db.engine.execute(f"update join_requests set created_at = '{past_date}'")
        db.engine.execute(f"update collaboration_requests set created_at = '{past_date}'")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            outstanding_requests(self.app)
            self.assertEqual(1, len(outbox))
            html = outbox[0].html
            self.assertTrue(f"New Collaboration requested by Peter Doe in organization UUC at {past_date}" in html)
            self.assertTrue(f"John Doe requested access to collaboration AI computing at {past_date}" in html)

    def test_no_outstanding_requests(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            outstanding_requests(self.app)
            self.assertEqual(0, len(outbox))
