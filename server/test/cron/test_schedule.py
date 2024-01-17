
from server.cron.schedule import start_scheduling
from server.test.abstract_test import AbstractTest


class TestSchedule(AbstractTest):

    def test_start_scheduling(self):
        self.app.app_config.scim_sweep.enabled = True

        scheduler = start_scheduling(self.app)
        jobs = scheduler.get_jobs()

        self.assertTrue(scheduler.running)
        self.assertEqual(9, len(jobs))
