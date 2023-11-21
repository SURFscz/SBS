
import datetime

from server.cron.collaboration_expiration import expire_collaborations
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, co_research_name, co_teachers_name


class TestCollaborationExpiration(AbstractTest):

    def _setup_data(self):
        now = datetime.datetime.utcnow()
        cfq = self.app.app_config.collaboration_expiration
        # Will cause expiration warning mail
        threshold_upper = datetime.timedelta(days=cfq.expired_warning_mail_days_threshold)
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        coll.expiry_date = now + threshold_upper - datetime.timedelta(hours=12)
        db.session.merge(coll)
        coll = self.find_entity_by_name(Collaboration, co_research_name)
        # Will cause expiration and notification mail
        coll.expiry_date = now - datetime.timedelta(days=3)
        db.session.merge(coll)
        coll = self.find_entity_by_name(Collaboration, co_teachers_name)
        # Will cause deletion
        coll.expiry_date = now - datetime.timedelta(days=365 * 5)
        coll.status = STATUS_EXPIRED
        db.session.merge(coll)
        db.session.commit()

    def test_schedule(self):
        self._setup_data()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = expire_collaborations(self.app)
            self.assertEqual(1, len(results["collaborations_warned"]))
            self.assertEqual(co_ai_computing_name, results["collaborations_warned"][0]["name"])
            self.assertEqual(1, len(results["collaborations_expired"]))
            self.assertEqual(co_research_name, results["collaborations_expired"][0]["name"])
            self.assertEqual(1, len(results["collaborations_deleted"]))
            self.assertEqual(co_teachers_name, results["collaborations_deleted"][0]["name"])
            self.assertEqual(2, len(outbox))

        self.assertEqual(0, Collaboration.query.filter(Collaboration.name == co_teachers_name).count())
        self.assertEqual(STATUS_EXPIRED, self.find_entity_by_name(Collaboration, co_research_name).status)

    def test_system_expire_collaborations(self):
        self._setup_data()

        self.put("/api/system/expire_collaborations")
        self.assertEqual(0, Collaboration.query.filter(Collaboration.name == co_teachers_name).count())
        self.assertEqual(STATUS_EXPIRED, self.find_entity_by_name(Collaboration, co_research_name).status)
