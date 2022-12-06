from sqlalchemy import text

from server.cron.user_suspending import suspend_users, suspend_users_lock_name
from server.db.db import db
from server.db.domain import User, UserNameHistory
from server.test.abstract_test import AbstractTest


class TestUserSuspending(AbstractTest):

    def test_schedule_lock(self):
        session = db.create_session(options={})()
        try:
            session.execute(text(f"SELECT GET_LOCK('{suspend_users_lock_name}', 1)"))
            mail = self.app.mail
            with mail.record_messages() as outbox:
                suspend_users(self.app)
                self.assertEqual(0, len(outbox))
        finally:
            session.execute(text(f"SELECT RELEASE_LOCK('{suspend_users_lock_name}')"))

    def test_schedule(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = suspend_users(self.app)
            self.assertListEqual(["user_suspend_warning@example.org"], results["warning_suspend_notifications"])
            self.assertListEqual(["user_gets_suspended@example.org"], results["suspended_notifications"])
            self.assertListEqual(["user_deletion_warning@example.org"], results["warning_deleted_notifications"])
            self.assertListEqual(["user_gets_deleted@example.org"], results["deleted_notifications"])
            self.assertEqual(5, len(outbox))

        user_suspend_warning = self.find_entity_by_name(User, "user_suspend_warning")
        self.assertEqual(False, user_suspend_warning.suspended)
        notifications = user_suspend_warning.suspend_notifications
        self.assertEqual(1, len(notifications))
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
        notifications = user_deletion_warning.suspend_notifications
        self.assertEqual(1, len(notifications))
        self.assertTrue(notifications[0].is_warning)
        self.assertFalse(notifications[0].is_suspension)

        user_gets_deleted = self.find_entity_by_name(User, "user_gets_deleted")
        self.assertIsNone(user_gets_deleted)

        user_names_history = UserNameHistory.query.all()
        self.assertEqual(1, len(user_names_history))
        self.assertEqual("user_gets_deleted", user_names_history[0].username)
