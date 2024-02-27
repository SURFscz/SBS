import json
import time
import uuid

from flask import jsonify

from server.db.domain import Unit, Organisation
from server.test.abstract_test import AbstractTest
from server.tools import dt_today


class TestDynamicExtendedJSONEncoder(AbstractTest):

    def test_encoding(self):
        _uuid = uuid.uuid4()
        today = dt_today()

        obj = {"1": _uuid, "2": today, "3": "default", "4": (1, 2)}
        res = jsonify(obj).json

        self.assertEqual(res["1"], str(_uuid))
        self.assertEqual(res["2"], time.mktime(today.timetuple()))
        self.assertEqual(res["3"], "default")
        self.assertListEqual(res["4"], [1, 2])

    def test_units(self):
        unit_test = Unit(id=1, name="test", organisation_id=99)
        unit_support = Unit(id=1, name="support", organisation_id=99)
        organisation = Organisation(units=[unit_test, unit_support])

        res = jsonify(organisation).json
        units = sorted(res["units"])
        self.assertListEqual(["support", "test"], units)
