import datetime

import pytest
from sqlalchemy.exc import StatementError

from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest

base_user = dict(
    uid="urn:test",
    name="Test User",
    email="test@foo",
    schac_home_organisation="test.foo",
    username="test",
    external_id="test",
    created_by="testcase",
    updated_by="testcase"
)


class TestDatetime(AbstractTest):

    def test_datetime_none(self):
        test_user = User(**base_user, last_login_date=None)
        db.session.add(test_user)
        db.session.commit()

        test_user_readback = User.query.filter_by(uid=base_user["uid"]).first()
        self.assertIsNone(test_user_readback.last_login_date)

    def test_datetime_date(self):
        dt = datetime.datetime(2019, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
        date = dt.date()
        test_user = User(**base_user, last_login_date=date)
        db.session.add(test_user)
        db.session.commit()

        test_user_readback = User.query.filter_by(uid=base_user["uid"]).first()
        self.assertEqual(dt, test_user_readback.last_login_date)

    def test_datetime_no_timezone(self):
        invalid_dt = datetime.datetime(2019, 1, 1, 0, 0, 0)
        test_user = User(**base_user, last_login_date=invalid_dt)
        with pytest.raises(StatementError) as excinfo:
            db.session.add(test_user)
            db.session.commit()
        self.assertIn("must be timezone aware", str(excinfo.value))

    def test_datetime_invalid(self):
        test_user = User(**base_user, last_login_date=42)
        with pytest.raises(StatementError) as excinfo:
            db.session.add(test_user)
            db.session.commit()
        self.assertIn("Unknown type '<class 'int'>' for datetime", str(excinfo.value))
