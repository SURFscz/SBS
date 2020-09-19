# -*- coding: future_fstrings -*-
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestSystem(AbstractTest):

    def test_schedule(self):
        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertFalse(two_suspend.suspended)

        res = self.put("/api/system/suspend_users")
        self.assertDictEqual({"first_suspend_notification": ["inactive@example.org"],
                              "second_suspend_notification": ["one_suspend@example.org"],
                              "suspended": ["two_suspend@example.org"]}, res)

        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertTrue(two_suspend.suspended)

    def test_db_stats(self):
        res = self.get("/api/system/db_stats")
        self.assertDictEqual({"count": 15, "name": "users"}, res[0])
