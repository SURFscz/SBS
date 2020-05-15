# -*- coding: future_fstrings -*-
from server.cron.schedule import suspend_users, start_scheduling
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestSchedule(AbstractTest):

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

    def test_start_scheduling(self):
        scheduler = start_scheduling(self.app)
        jobs = scheduler.get_jobs()
        self.assertEqual(1, len(jobs))
