# -*- coding: future_fstrings -*-

from server.cron.orphan_users import delete_orphan_users
from server.test.abstract_test import AbstractTest


class TestOrphanUsers(AbstractTest):

    def test_schedule(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = delete_orphan_users(self.app)
            self.assertEqual(5, len(outbox))
            self.assertEqual(5, len(results["orphan_users"]))

            results = delete_orphan_users(self.app)
            self.assertEqual(0, len(results["orphan_users"]))

    def test_system_orphan_users(self):
        results = self.put("/api/system/orphan_users")
        self.assertEqual(5, len(results["orphan_users"]))
