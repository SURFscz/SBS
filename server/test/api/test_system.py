# -*- coding: future_fstrings -*-
from server.api.base import STATUS_DENIED, STATUS_APPROVED
from server.cron.schedule import start_scheduling
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import organisation_invitation_hash


class TestSystem(AbstractTest):

    def test_schedule(self):
        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertFalse(two_suspend.suspended)

        res = self.put("/api/system/suspend_users")
        self.assertDictEqual({"first_suspend_notification": ["inactive@example.org"],
                              "second_suspend_notification": ["one_suspend@example.org"],
                              "suspended": ["two_suspend@example.org"],
                              "deleted": ["to_be_deleted@example.org"]}, res)

        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertTrue(two_suspend.suspended)

    def test_db_stats(self):
        res = self.get("/api/system/db_stats")
        self.assertDictEqual({"count": 17, "name": "users"}, res[0])

    def test_db_seed(self):
        self.get("/api/system/seed", response_status_code=201)

    def test_outstanding_requests(self):
        past_date = "2018-03-20 14:51:40"
        db.engine.execute(f"update join_requests set created_at = '{past_date}'")
        db.engine.execute(f"update collaboration_requests set created_at = '{past_date}'")
        res = self.get("/api/system/outstanding_requests")

        self.assertTrue(len(res["collaboration_requests"]) > 0)
        self.assertTrue(len(res["collaboration_join_requests"]) > 0)

    def test_cleanup_non_open_requests(self):
        past_date = "2018-03-20 14:51:40"
        db.engine.execute(f"update join_requests set created_at = '{past_date}', status = '{STATUS_DENIED}'")
        db.engine.execute(f"update collaboration_requests set created_at = '{past_date}', status = '{STATUS_APPROVED}'")
        res = self.put("/api/system/cleanup_non_open_requests")

        self.assertTrue(len(res["collaboration_requests"]) > 0)
        self.assertTrue(len(res["collaboration_join_requests"]) > 0)

    def test_db_seed_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.get("/api/system/seed", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1

    def test_scheduled_jobs(self):
        jobs = self.get("/api/system/scheduled_jobs")
        self.assertEqual(0, len(jobs))

        start_scheduling(self.app)
        jobs = self.get("/api/system/scheduled_jobs")
        self.assertEqual(7, len(jobs))

    def test_clear_audit_logs(self):
        self.login("urn:sarah")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)

        res = self.get("/api/audit_logs/activity")
        self.assertEqual(3, len(res["audit_logs"]))

        self.login("urn:john")
        self.delete("/api/system/clear-audit-logs", response_status_code=201)
        res = self.get("/api/audit_logs/activity")
        self.assertEqual(0, len(res["audit_logs"]))

    def test_clear_audit_logs_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.delete("/api/system/clear-audit-logs", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1

    def test_feedback(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.login("urn:sarah")
            self.post("/api/system/feedback", body={"message": "great\nawesome"}, response_status_code=201)
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertTrue("great" in mail_msg.html)

    def test_feedback_forbidden(self):
        self.app.app_config.feature.feedback_enabled = 0
        self.post("/api/system/feedback", body={"message": "great\nawesome"}, response_status_code=400)
        self.app.app_config.feature.feedback_enabled = 1

    def test_db_clean_slate(self):
        self.delete("/api/system/clean_slate", response_status_code=201)

    def test_db_clean_slate_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.delete("/api/system/clean_slate", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1
