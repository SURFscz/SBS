from flask import current_app
from sqlalchemy import text

from server.cron.schedule import start_scheduling
from server.db.db import db
from server.db.defaults import STATUS_DENIED, STATUS_APPROVED
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_invitation_hash


class TestSystem(AbstractTest):

    def test_schedule(self):
        user_gets_suspended = self.find_entity_by_name(User, "user_gets_suspended")
        self.assertFalse(user_gets_suspended.suspended)

        self.put("/api/system/suspend_users")
        user_gets_suspended = self.find_entity_by_name(User, "user_gets_suspended")
        self.assertTrue(user_gets_suspended.suspended)

    def test_db_stats(self):
        res = self.get("/api/system/db_stats")
        self.assertEqual(46, len(res))
        # convert list to proper dict:
        stats = {r["name"]: r["count"] for r in res}
        self.assertEqual(len(res), len(stats.keys()))

    def test_db_seed(self):
        self.get("/api/system/seed", response_status_code=201)

    def test_db_seed_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.get("/api/system/seed", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1

    def test_db_demo_seed(self):
        self.get("/api/system/demo_seed", response_status_code=201)

    def test_db_demo_seed_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.get("/api/system/demo_seed", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1

    def test_outstanding_requests(self):
        past_date = "2018-03-20 14:51:40"
        with db.engine.connect() as conn:
            with conn.begin():
                conn.execute(text(f"update join_requests set created_at = '{past_date}'"))
                conn.execute(text(f"update collaboration_requests set created_at = '{past_date}'"))
        res = self.get("/api/system/outstanding_requests")

        self.assertTrue(len(res["collaboration_requests"]) > 0)
        self.assertTrue(len(res["collaboration_join_requests"]) > 0)

    def test_cleanup_non_open_requests(self):
        past_date = "2018-03-20 14:51:40"
        with db.engine.connect() as conn:
            with conn.begin():
                conn.execute(text(f"update join_requests set created_at = '{past_date}', status = '{STATUS_DENIED}'"))
                conn.execute(text(f"update collaboration_requests set created_at = '{past_date}'"
                                  f", status = '{STATUS_APPROVED}'"))
            db.session.commit()
        res = self.put("/api/system/cleanup_non_open_requests")

        self.assertTrue(len(res["collaboration_requests"]) > 0)
        self.assertTrue(len(res["collaboration_join_requests"]) > 0)

    def test_scheduled_jobs(self):
        jobs = self.get("/api/system/scheduled_jobs")
        self.assertEqual(0, len(jobs))

        start_scheduling(self.app)
        jobs = self.get("/api/system/scheduled_jobs")
        self.assertEqual(11, len(jobs))

    def test_scheduled_jobs_async(self):
        try:
            current_app.app_config.metadata.parse_at_startup = True
            start_scheduling(self.app)
            self.get("/api/system/scheduled_jobs")
        finally:
            current_app.app_config.metadata.parse_at_startup = False

    def test_clear_audit_logs(self):
        self.login("urn:sarah")
        self.put("/api/organisation_invitations/accept", body={"hash": unihard_invitation_hash},
                 with_basic_auth=False)

        self.login("urn:john")
        res = self.get("/api/audit_logs/activity")
        self.assertEqual(4, len(res["audit_logs"]))

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

    def test_validations(self):
        res = self.get("/api/system/validations", response_status_code=200)
        self.assertEqual(2, len(res["organisation_invitations"]))
        self.assertEqual(0, len(res['services']))
        self.assertEqual(0, len(res["organisations"]))

    def test_composition(self):
        composition = self.get("/api/system/composition")
        self.assertTrue(composition["test"])

    def test_composition_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.get("/api/system/composition", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1

    def test_statistics(self):
        res = self.get("/api/system/statistics")
        self.assertEqual(8, len(res))

    def test_parse_metadata(self):
        res = self.get("/api/system/parse_metadata")
        self.assertIn("schac_home_organizations", res)
        self.assertEqual(5, len(res["schac_home_organizations"]))

    def test_sweep(self):
        res = self.get("/api/system/sweep")
        self.assertEqual(1, len(res))
        self.assertIn("services", res)
        self.assertEqual(1, len(res["services"]))
        self.assertEqual("Network Services", res["services"][0]["name"])

    def test_open_requests(self):
        res = self.get("/api/system/open_requests")
        self.assertEqual(6, len(res))

    def test_pam_services(self):
        res = self.get("/api/system/pam-services")
        self.assertEqual(1, len(res))
