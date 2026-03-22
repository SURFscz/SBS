from datetime import timedelta

from freezegun import freeze_time
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from server.cron.user_suspending import suspend_users, suspend_users_lock_name
from server.db.db import db
from server.db.domain import User, UserNameHistory
from server.test.abstract_test import AbstractTest
from server.test.seed import user_james_name
from server.tools import dt_now


class TestUserSuspending(AbstractTest):

    def test_schedule_lock(self):
        session = sessionmaker(self.app.db.engine)()
        try:
            # Insert a lock to simulate another instance holding it
            session.execute(
                text("INSERT INTO distributed_locks (lock_name, acquired_at) VALUES (:lock_name, NOW())"),
                {"lock_name": suspend_users_lock_name}
            )
            session.commit()
            
            # Run the method - it should fail to obtain the lock and not send any emails
            mail = self.app.mail
            with mail.record_messages() as outbox:
                suspend_users(self.app)
                self.assertEqual(0, len(outbox))
        finally:
            # Clean up the lock
            session.execute(
                text("DELETE FROM distributed_locks WHERE lock_name = :lock_name"),
                {"lock_name": suspend_users_lock_name}
            )
            session.commit()
            session.close()

    def test_schedule(self):
        mail = self.app.mail

        with mail.record_messages() as outbox:
            results = suspend_users(self.app)
            self.assertListEqual(["user_suspend_warning@example.org"], results["warning_suspend_notifications"])
            self.assertListEqual(["user_gets_suspended@example.org"], results["suspended_notifications"])
            self.assertListEqual(["user_deletion_warning@example.org"], results["warning_deleted_notifications"])
            self.assertListEqual(["user_gets_deleted@example.org"], results["deleted_notifications"])
            self.assertEqual(5, len(outbox))

            # check recepients of mails
            self.assertListEqual(["user_suspend_warning@example.org", "user_gets_suspended@example.org",
                                  "user_deletion_warning@example.org", "support+sram@eduteams.org", "sram-beheer@surf.nl"],
                                 [m.to[0] for m in outbox])

            # find results mail
            messages = [m for m in outbox if "Results of inactive account check" in m.subject]
            self.assertEqual(1, len(messages))
            self.assertIn("suspension warning:\n  - user_suspend_warning@example.org", messages[0].body)
            self.assertIn("have been suspended:\n  - user_gets_suspended@example.org", messages[0].body)
            self.assertIn("deletion warning:\n  - user_deletion_warning@example.org", messages[0].body)
            self.assertIn("have been deleted:\n  - user_gets_deleted@example.org", messages[0].body)

        user_suspend_warning = self.find_entity_by_name(User, "user_suspend_warning")
        self.assertEqual(False, user_suspend_warning.suspended)
        notifications = user_suspend_warning.suspend_notifications
        self.assertEqual(2, len(notifications))
        notifications.sort(key=lambda n: n.sent_at, reverse=True)
        self.assertTrue(notifications[0].is_warning)
        self.assertTrue(notifications[0].is_suspension)

        user_gets_suspended = self.find_entity_by_name(User, "user_gets_suspended")
        self.assertEqual(True, user_gets_suspended.suspended)
        notifications = user_gets_suspended.suspend_notifications
        self.assertEqual(2, len(notifications))
        notifications.sort(key=lambda n: n.sent_at, reverse=True)
        self.assertFalse(notifications[0].is_warning)
        self.assertTrue(notifications[0].is_suspension)

        user_deletion_warning = self.find_entity_by_name(User, "user_deletion_warning")
        self.assertEqual(True, user_deletion_warning.suspended)
        notifications = user_deletion_warning.suspend_notifications
        self.assertEqual(2, len(notifications))
        notifications.sort(key=lambda n: n.sent_at, reverse=True)
        self.assertTrue(notifications[0].is_warning)
        self.assertFalse(notifications[0].is_suspension)

        user_gets_deleted = self.find_entity_by_name(User, "user_gets_deleted")
        self.assertIsNone(user_gets_deleted)

        user_names_history = UserNameHistory.query.all()
        self.assertEqual(1, len(user_names_history))
        self.assertEqual("user_gets_deleted", user_names_history[0].username)

        # now run suspend cron job again; nothing should change!
        with mail.record_messages() as outbox:
            results = suspend_users(self.app)
            self.assertListEqual([], results["warning_suspend_notifications"])
            self.assertListEqual([], results["suspended_notifications"])
            self.assertListEqual([], results["warning_deleted_notifications"])
            self.assertListEqual([], results["deleted_notifications"])
            self.assertListEqual([], outbox)

        # now fast-forward time
        retention = self.app.app_config.retention
        newdate = (dt_now()
                   + timedelta(retention.reminder_suspend_period_days)
                   + timedelta(retention.remove_suspended_users_period_days))
        with freeze_time(newdate):
            with mail.record_messages() as outbox:
                results = suspend_users(self.app)
                self.assertListEqual([], results["warning_suspend_notifications"])
                self.assertListEqual(["user_suspend_warning@example.org"], results["suspended_notifications"])
                self.assertListEqual(["user_gets_suspended@example.org"], results["warning_deleted_notifications"])
                self.assertListEqual(["user_deletion_warning@example.org"], results["deleted_notifications"])

                self.assertEqual(4, len(outbox))
                to = set([m.to[0] for m in outbox])
                self.assertSetEqual({"user_suspend_warning@example.org", "user_gets_suspended@example.org",
                                     "sram-beheer@surf.nl", "support+sram@eduteams.org"}, to)

    def test_schedule_changed_config(self):
        mail = self.app.mail

        # run suspend cron job
        results = suspend_users(self.app)
        self.assertListEqual(["user_suspend_warning@example.org"], results["warning_suspend_notifications"])
        self.assertListEqual(["user_gets_suspended@example.org"], results["suspended_notifications"])
        self.assertListEqual(["user_deletion_warning@example.org"], results["warning_deleted_notifications"])
        self.assertListEqual(["user_gets_deleted@example.org"], results["deleted_notifications"])

        # now we change the config
        # this causes the last active date of all suspended users to shift past the deletion date
        self.app.app_config.retention.allowed_inactive_period_days -= (
            self.app.app_config.retention.remove_suspended_users_period_days
            + 1)
        # now run suspend cron job again; nothing should change!
        with mail.record_messages() as outbox:
            results = suspend_users(self.app)
            self.assertListEqual([], results["warning_suspend_notifications"])
            self.assertListEqual([], results["suspended_notifications"])
            self.assertListEqual([], results["warning_deleted_notifications"])
            self.assertListEqual([], results["deleted_notifications"])
            self.assertEqual(0, len(outbox))

        # now fast-forward time past the waiting window
        retention = self.app.app_config.retention
        newdate = (dt_now()
                   + timedelta(retention.reminder_suspend_period_days)
                   + timedelta(retention.remove_suspended_users_period_days))
        with freeze_time(newdate):
            with mail.record_messages() as outbox:
                # now users should be suspended/reminede again because their notifications are older than the threshold
                results = suspend_users(self.app)
                self.assertListEqual([], results["warning_suspend_notifications"])
                self.assertListEqual(["user_suspend_warning@example.org"], results["suspended_notifications"])
                self.assertListEqual(["user_gets_suspended@example.org"], results["warning_deleted_notifications"])
                self.assertListEqual(["user_deletion_warning@example.org"], results["deleted_notifications"])
                self.assertEqual(4, len(outbox))

    def test_schedule_exception(self):
        # lookup user james and set her to suspended
        james = self.find_entity_by_name(User, user_james_name)
        james.suspended = True
        james.last_login_date = dt_now() - timedelta(days=3650)
        db.session.merge(james)
        db.session.commit()

        self.assertRaisesRegex(Exception, "is suspended but has no suspension notification", suspend_users, self.app)
