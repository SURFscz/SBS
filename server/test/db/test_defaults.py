import datetime
import time
from unittest import TestCase

from munch import munchify
from werkzeug.exceptions import BadRequest

from server.db.defaults import default_expiry_date, calculate_expiry_period, cleanse_short_name, valid_uri_attributes, \
    uri_re
from server.db.domain import Invitation


class TestDefaults(TestCase):

    def test_default_expiry_date(self):
        default_date = default_expiry_date()
        res = default_date - datetime.datetime.today()
        self.assertEqual(14, res.days)

    def test_expiry_date(self):
        date = default_expiry_date({"expiry_date": time.time()})
        res = date - datetime.datetime.today()
        self.assertEqual(-1, res.days)

    def test_calculate_expiry_period_days(self):
        period = calculate_expiry_period(
            munchify({"expiry_date": datetime.datetime.today() + datetime.timedelta(days=15)}))
        self.assertTrue(period.endswith("days"))

    def test_calculate_expiry_period_hours(self):
        today = datetime.datetime.today()
        period = calculate_expiry_period(munchify({"expiry_date": today + datetime.timedelta(hours=6)}), today=today)
        self.assertTrue(period.endswith("hours"))

    def test_calculate_expiry_period_today(self):
        today = datetime.datetime.today()
        period = calculate_expiry_period(munchify({"expiry_date": today}), today=today)
        self.assertEqual("0 minutes", period)

    def test_calculate_expiry_period_default(self):
        period = calculate_expiry_period({})
        self.assertEqual("15 days", period)

        period = calculate_expiry_period(Invitation())
        self.assertEqual("15 days", period)

    def test_calculate_expiry_period_diff(self):
        today = datetime.datetime.today()
        period = calculate_expiry_period(munchify({"expiry_date": today + datetime.timedelta(minutes=15)}), today=today)
        self.assertEqual("15 minutes", period)

    def test_calculate_expiry_period_db_object(self):
        invitation = Invitation(expiry_date=datetime.datetime.today() + datetime.timedelta(minutes=15))
        period = calculate_expiry_period(invitation)
        self.assertTrue(period.endswith("minutes"))

    def test_calculate_expiry_period_with_today_hour(self):
        today = datetime.datetime.today()
        invitation = Invitation(expiry_date=today + datetime.timedelta(hours=1))
        period = calculate_expiry_period(invitation, today=today)
        self.assertEqual("1 hour", period)

    def test_calculate_expiry_period_with_today_day(self):
        today = datetime.datetime.today()
        invitation = Invitation(expiry_date=today + datetime.timedelta(days=1))
        period = calculate_expiry_period(invitation, today=today)
        self.assertEqual("1 day", period)

    def test_cleanse_short_name(self):
        def raises_bad_request():
            cleanse_short_name({})

        self.assertRaises(BadRequest, raises_bad_request)

    def test_cleanse_short_name_reg(self):
        def _test_cleansing(short_name, expected):
            data = {"short_name": short_name}
            cleanse_short_name(data)
            self.assertEqual(expected, data["short_name"])

        _test_cleansing("1QWERTY", "qwerty")
        _test_cleansing("123456789012345678X", "x")
        _test_cleansing("1ABC!D@E#F&G(HIJ)KLMNO-PQRSTUVWYZ", "abcdefghijklmnop")

    def test_valid_uri_attributes(self):
        self.assertTrue(valid_uri_attributes({"url": "https://sram.org"}, ["url"]))

        def invalid_uri():
            valid_uri_attributes({"url": "nope"}, ["url"])

        self.assertRaises(ValueError, invalid_uri)

    def test_uri_regexp(self):
        self.assertTrue(bool(uri_re.match("https://localhost/api/scim_mock")))
        self.assertTrue(bool(uri_re.match("http://localhost:8080/api/scim_mock")))
        self.assertTrue(bool(uri_re.match("https://demo-sp.sram.surf.nl/test")))
        self.assertTrue(bool(uri_re.match("https://google.nl")))
        self.assertTrue(bool(uri_re.match("https://google")))
        self.assertTrue(bool(uri_re.match("https://google")))

    def test_valid_uri_attributes_trim(self):
        data = {"uri": "https://auth.tudelft.nl "}
        self.assertTrue(valid_uri_attributes(data, ["uri"]))
        self.assertTrue("https://auth.tudelft.nl", data["uri"])

        self.assertTrue(valid_uri_attributes({}, ["uri"]))
        data = {"uri": "https://auth.tudelft.nl/{co_short_name}{username}"}
        self.assertTrue(valid_uri_attributes(data, ["uri"]))

        data = {"uri": "https://auth.tudelft.nl/auth/realms/sram/protocol/saml/clients/amazon-aws "}
        self.assertTrue(valid_uri_attributes(data, ["uri"]))
