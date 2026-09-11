
import datetime

from server.cron.membership_expiration import expire_memberships
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration, CollaborationMembership, User
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, user_sarah_name, user_jane_name, \
    user_boss_name
from server.tools import dt_now


class TestMembershipExpiration(AbstractTest):

    def _setup_data(self):
        now = dt_now()
        cfq = self.app.app_config.membership_expiration
        # Will cause expiration warning mail
        threshold_upper = datetime.timedelta(days=cfq.expired_warning_mail_days_threshold)
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        sarah_cm = next(cm for cm in coll.collaboration_memberships if cm.user.name == user_sarah_name)
        sarah_cm.expiry_date = now + threshold_upper - datetime.timedelta(hours=12)
        db.session.merge(sarah_cm)
        # Will cause expiration and notification mail
        jane_cm = next(cm for cm in coll.collaboration_memberships if cm.user.name == user_jane_name)
        jane_cm.expiry_date = now - datetime.timedelta(days=3)
        db.session.merge(jane_cm)
        # Will cause deletion
        boss_cm = next(cm for cm in coll.collaboration_memberships if cm.user.name == user_boss_name)
        boss_cm.expiry_date = now - datetime.timedelta(days=365 * 5)
        boss_cm.status = STATUS_EXPIRED
        db.session.merge(boss_cm)
        db.session.commit()

    def test_schedule(self):
        self._setup_data()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = expire_memberships(self.app)
            self.assertEqual(1, len(results["memberships_warned"]))
            self.assertEqual(user_sarah_name, results["memberships_warned"][0]["user"]["name"])
            self.assertEqual(1, len(results["memberships_expired"]))
            self.assertEqual(user_jane_name, results["memberships_expired"][0]["user"]["name"])
            self.assertEqual(1, len(results["memberships_deleted"]))
            self.assertEqual(user_boss_name, results["memberships_deleted"][0]["user"]["name"])
            self.assertEqual(4, len(outbox))

            # The warning mails are sent before the admin (Boss)'s own expired membership is deleted below
            warning_admin_mail, warning_member_mail, expired_admin_mail, expired_member_mail = outbox
            self.assertEqual(["boss@example.org"], warning_admin_mail.to)
            self.assertEqual(["sarah@uni-franeker.nl"], warning_member_mail.to)
            self.assertEqual(["jane@ucc.org"], expired_member_mail.to)
            # Boss (the only collaboration admin) has been deleted by the time the expired notification is sent,
            # so the admin mail falls back to the organisation admins/managers
            self.assertNotIn("boss@example.org", expired_admin_mail.to)
            self.assertTrue(len(expired_admin_mail.to) > 0)

        self.assertEqual(0, CollaborationMembership.query
                         .join(CollaborationMembership.collaboration)
                         .join(CollaborationMembership.user)
                         .filter(Collaboration.name == co_ai_computing_name)
                         .filter(User.name == user_boss_name)
                         .count())
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        jane_cm = next(cm for cm in coll.collaboration_memberships if cm.user.name == user_jane_name)
        self.assertEqual(STATUS_EXPIRED, jane_cm.status)

    def test_system_expire_collaborations(self):
        self._setup_data()

        self.put("/api/system/expire_memberships")
        self.assertEqual(0, CollaborationMembership.query
                         .join(CollaborationMembership.collaboration)
                         .join(CollaborationMembership.user)
                         .filter(Collaboration.name == co_ai_computing_name)
                         .filter(User.name == user_boss_name)
                         .count())
