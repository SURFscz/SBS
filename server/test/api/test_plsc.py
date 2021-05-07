# -*- coding: future_fstrings -*-

from server.test.abstract_test import AbstractTest


class TestPlsc(AbstractTest):

    def test_fetch(self):
        res = self.get("/api/plsc/sync")
        self.assertEqual(2, len(res["organisations"]))
        self.assertEqual(17, len(res["users"]))
        self.assertEqual(8, len(res["services"]))
