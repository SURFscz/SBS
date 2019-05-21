# -*- coding: future_fstrings -*-
import datetime
import time
from unittest import TestCase

from server.db.defaults import default_expiry_date


class TestDefaults(TestCase):

    def test_default_expiry_date(self):
        default_date = default_expiry_date()
        res = default_date - datetime.datetime.today()
        self.assertEqual(14, res.days)

    def test_expiry_date(self):
        date = default_expiry_date({"expiry_date": time.time()})
        res = date - datetime.datetime.today()
        self.assertEqual(-1, res.days)
