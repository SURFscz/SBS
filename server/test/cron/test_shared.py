from cron.shared import obtain_lock
from server.test.abstract_test import AbstractTest


def success(app):
    return True


def failure():
    return False


class TestShared(AbstractTest):

    def test_schedule_lock_not_cron_job_responsible(self):
        try:
            self.app.app_config.cron_job_responsible = False
            lock = obtain_lock(self.app, "test", success, failure)
            self.assertFalse(lock)
        finally:
            self.app.app_config.cron_job_responsible = True

    def test_schedule_lock_cron_job_responsible(self):
        lock = obtain_lock(self.app, "test", success, failure)
        self.assertTrue(lock)
