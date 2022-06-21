# -*- coding: future_fstrings -*-

from server.test.abstract_test import AbstractTest


class TestUserLogin(AbstractTest):

    def test_summary(self):
        res = self.get("/api/user_logins/summary")
        self.assertDictEqual({"c": 0, "cs": 0, "cu": 0}, res)
