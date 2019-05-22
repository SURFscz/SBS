# -*- coding: future_fstrings -*-
import uuid
import time
from datetime import date

from flask import jsonify

from server.test.abstract_test import AbstractTest


class TestDynamicExtendedJSONEncoder(AbstractTest):

    def test_date_encoding(self):
        _uuid = uuid.uuid4()
        today = date.today()

        obj = {"1": _uuid, "2": today}
        res = jsonify(obj).json

        self.assertEqual(res["1"], str(_uuid))
        self.assertEqual(res["2"], time.mktime(today.timetuple()))
