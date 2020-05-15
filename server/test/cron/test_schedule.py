from server.cron.schedule import suspend_users
from server.test.abstract_test import AbstractTest


class TestSchedule(AbstractTest):

    def test_schedule(self):
        suspend_users(self.app)
