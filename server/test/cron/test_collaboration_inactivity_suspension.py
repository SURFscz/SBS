
import datetime

from server.cron.collaboration_inactivity_suspension import suspend_collaborations
from server.db.db import db
from server.db.defaults import STATUS_SUSPENDED
from server.db.domain import Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, co_research_name, co_teachers_name, co_monitoring_name
from server.tools import dt_now, dt_today


class TestCollaborationInactivitySuspension(AbstractTest):

    def _setup_data(self):
        now = dt_now()
        cfq = self.app.app_config.collaboration_suspension
        threshold_for_warning = cfq.collaboration_inactivity_days_threshold - cfq.inactivity_warning_mail_days_threshold
        threshold_upper = datetime.timedelta(days=threshold_for_warning)
        warning_start_date = now - threshold_upper + datetime.timedelta(hours=12)

        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        # Will cause warning email
        coll.last_activity_date = warning_start_date
        db.session.merge(coll)

        coll = self.find_entity_by_name(Collaboration, co_research_name)
        notification_start_date = now - threshold_upper - datetime.timedelta(days=365 * 2)
        # Will cause notification email
        coll.last_activity_date = notification_start_date
        db.session.merge(coll)

        deletion_date = now - datetime.timedelta(days=365 * 5)

        coll = self.find_entity_by_name(Collaboration, co_monitoring_name)
        coll.last_activity_date = deletion_date
        # Because of the expiry_date is not None, this collaboration will be ignored
        coll.expiry_date = dt_today() + datetime.timedelta(days=14)
        coll.status = STATUS_SUSPENDED
        db.session.merge(coll)

        coll = self.find_entity_by_name(Collaboration, co_teachers_name)
        # Will cause deletion
        coll.last_activity_date = deletion_date
        coll.status = STATUS_SUSPENDED
        db.session.merge(coll)
        db.session.commit()

    def test_schedule(self):
        self._setup_data()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = suspend_collaborations(self.app)
            self.assertEqual(1, len(results["collaborations_warned"]))
            self.assertEqual(co_ai_computing_name, results["collaborations_warned"][0]["name"])
            self.assertEqual(1, len(results["collaborations_suspended"]))
            self.assertEqual(co_research_name, results["collaborations_suspended"][0]["name"])
            self.assertEqual(1, len(results["collaborations_deleted"]))
            self.assertEqual(co_teachers_name, results["collaborations_deleted"][0]["name"])
            self.assertEqual(2, len(outbox))

        self.assertEqual(0, Collaboration.query.filter(Collaboration.name == co_teachers_name).count())

    def test_system_expire_collaborations(self):
        self._setup_data()

        self.put("/api/system/suspend_collaborations")
        self.assertEqual(0, Collaboration.query.filter(Collaboration.name == co_teachers_name).count())
