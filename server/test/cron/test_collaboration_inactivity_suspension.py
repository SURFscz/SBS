# -*- coding: future_fstrings -*-

import datetime

from server.cron.collaboration_inactivity_suspension import suspend_collaborations
from server.db.db import db
from server.db.defaults import STATUS_SUSPENDED
from server.db.domain import Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name, uva_research_name, uuc_teachers_name


class TestCollaborationInactivitySuspension(AbstractTest):

    def test_schedule(self):
        now = datetime.datetime.utcnow()
        cfq = self.app.app_config.collaboration_suspension

        threshold_upper = datetime.timedelta(days=cfq.inactivity_warning_mail_days_threshold)
        warning_start_date = now - threshold_upper + datetime.timedelta(hours=12)
        coll = self.find_entity_by_name(Collaboration, ai_computing_name)
        # Will cause warning email
        coll.last_activity_date = warning_start_date
        db.session.merge(coll)

        coll = self.find_entity_by_name(Collaboration, uva_research_name)
        notification_start_date = now - threshold_upper - datetime.timedelta(days=365 * 2)
        # Will cause notification email
        coll.last_activity_date = notification_start_date
        db.session.merge(coll)

        coll = self.find_entity_by_name(Collaboration, uuc_teachers_name)
        deletion_date = now - datetime.timedelta(days=365 * 5)
        # Will cause deletion
        coll.last_activity_date = deletion_date
        coll.status = STATUS_SUSPENDED
        db.session.merge(coll)

        db.session.commit()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = suspend_collaborations(self.app)
            self.assertEqual(1, len(results["collaborations_warned"]))
            self.assertEqual(ai_computing_name, results["collaborations_warned"][0]["name"])
            self.assertEqual(1, len(results["collaborations_suspended"]))
            self.assertEqual(uva_research_name, results["collaborations_suspended"][0]["name"])
            self.assertEqual(1, len(results["collaborations_deleted"]))
            self.assertEqual(uuc_teachers_name, results["collaborations_deleted"][0]["name"])
            self.assertEqual(2, len(outbox))

        self.assertEqual(0, Collaboration.query.filter(Collaboration.name == uuc_teachers_name).count())