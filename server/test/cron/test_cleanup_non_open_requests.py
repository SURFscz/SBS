from sqlalchemy import text

from server.api.base import STATUS_DENIED, STATUS_APPROVED
from server.cron.cleanup_non_open_requests import cleanup_non_open_requests
from server.db.db import db
from server.test.abstract_test import AbstractTest


class TestCleanupNonOpenRequests(AbstractTest):

    def test_cleanup_non_open_requests(self):
        # Ensure we have results
        past_date = "2018-03-20 14:51:40"
        with db.engine.connect() as conn:
            with conn.begin():
                conn.execute(text(f"update join_requests set created_at = '{past_date}', status = '{STATUS_DENIED}'"))
                conn.execute(text(f"update collaboration_requests set created_at = '{past_date}',"
                                  f" status = '{STATUS_APPROVED}'"))
        res = cleanup_non_open_requests(self.app)
        self.assertEqual(2, len(res["collaboration_requests"]))
        self.assertEqual(4, len(res["collaboration_join_requests"]))
