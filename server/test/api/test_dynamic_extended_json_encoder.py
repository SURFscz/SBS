import time
import uuid

from flask import jsonify

from server.test.abstract_test import AbstractTest
from server.tools import dt_today


class TestDynamicExtendedJSONEncoder(AbstractTest):

    def test_encoding(self):
        _uuid = uuid.uuid4()
        today = dt_today()

        obj = {"1": _uuid, "2": today, "3": "default", "4": (1, 2), "5": {"s", "e", "t"}}
        res = jsonify(obj).json

        self.assertEqual(res["1"], str(_uuid))
        self.assertEqual(res["2"], time.mktime(today.timetuple()))
        self.assertEqual(res["3"], "default")
        self.assertListEqual(res["4"], [1, 2])
        self.assertListEqual(sorted(res["5"]), ["e", "s", "t"])
