from sqlalchemy import text

from server.cron.outstanding_requests import outstanding_requests
from server.db.db import db
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestOutstandingRequests(AbstractTest):

    def test_outstanding_requests(self):
        # Ensure we have results
        past_date = "2018-03-20 14:51:40"
        with db.engine.connect() as conn:
            with conn.begin():
                conn.execute(text(f"update join_requests set created_at = '{past_date}'"))
                conn.execute(text(f"update collaboration_requests set created_at = '{past_date}'"))
        mail = self.app.mail
        with mail.record_messages() as outbox:
            outstanding_requests(self.app)
            self.assertEqual(1, len(outbox))
            html = outbox[0].html
            self.assertIn(f"New Collaboration requested by Peter Doe in organization {uuc_name} at {past_date}", html)
            self.assertIn(f"John Doe requested access to collaboration AI computing at {past_date}", html)

    def test_no_outstanding_requests(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            outstanding_requests(self.app)
            self.assertEqual(0, len(outbox))
