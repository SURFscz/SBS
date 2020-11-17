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
                              "suspended": ["two_suspend@example.org"],
                              "deleted": ["to_be_deleted@example.org"]}, res)

        two_suspend = self.find_entity_by_name(User, "two_suspend")
        self.assertTrue(two_suspend.suspended)

    def test_db_stats(self):
        res = self.get("/api/system/db_stats")
        self.assertDictEqual({"count": 17, "name": "users"}, res[0])

    def test_db_seed(self):
        self.get("/api/system/seed", response_status_code=201)

    def test_db_seed_forbidden(self):
        self.app.app_config.feature.seed_allowed = 0
        self.get("/api/system/seed", response_status_code=400)
        self.app.app_config.feature.seed_allowed = 1
