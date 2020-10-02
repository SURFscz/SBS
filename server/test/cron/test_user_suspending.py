# -*- coding: future_fstrings -*-
from sqlalchemy import text

from server.cron.user_suspending import suspend_users, suspend_users_lock_name
from server.db.db import db
from server.db.domain import User
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
            suspend_users(self.app)
            self.assertEqual(2, len(outbox))

        inactive = self.find_entity_by_name(User, "inactive")
        self.assertEqual(False, inactive.suspended)
        self.assertEqual(1, len(inactive.suspend_notifications))

        one_suspend = self.find_entity_by_name(User, "one_suspend")
        self.assertEqual(False, one_suspend.suspended)
        self.assertEqual(2, len(one_suspend.suspend_notifications))

        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertEqual(True, two_suspend.suspended)
