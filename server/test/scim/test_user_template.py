import datetime
import uuid
from unittest import TestCase

from server.db.domain import User
from server.scim.user_template import find_user_by_id_template
from server.tools import dt_now


class TestUserTemplate(TestCase):

    def test_find_user_by_id_template(self):
        now = dt_now()
        days = 365 * 2
        last_login_date = now - datetime.timedelta(days=(days), weeks=3)
        user = User(external_id=uuid.uuid4(), name="John Doe", email="jdoe@domain.com", updated_at=now, created_at=now,
                    last_login_date=last_login_date)
        result = find_user_by_id_template(user)

        self.assertEqual(result["displayName"], user.name)
        self.assertEqual(result["name"]["familyName"], "")
        self.assertEqual(days, result["urn:mace:surf.nl:sram:scim:extension:User"]["sramInactiveDays"])
