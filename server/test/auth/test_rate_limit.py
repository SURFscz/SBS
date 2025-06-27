from uuid import uuid4

from werkzeug.exceptions import TooManyRequests

from server.auth.rate_limit import rate_limit_reached, check_rate_limit
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestRateLimit(AbstractTest):

    def test_rate_limit_reached(self):
        user = User(id=999, uid=uuid4(), created_by="system", updated_by="system", external_id=uuid4())
        reached = rate_limit_reached(user)
        self.assertFalse(reached)
        for i in range(9):
            rate_limit_reached(user)
        reached = rate_limit_reached(user)
        self.assertTrue(reached)

        self.assertRaises(TooManyRequests, lambda: check_rate_limit(user))

        user.rate_limited = False
        self.save_entity(user)

        mail = self.app.mail
        with mail.record_messages() as outbox:
            try:
                check_rate_limit(user)
            except TooManyRequests:
                pass
            self.assertTrue(user.rate_limited)
            self.assertIsNone(user.mfa_reset_token)
            self.assertIsNone(user.second_factor_auth)
            self.assertIsNone(user.last_login_date)

            self.assertEqual(1, len(outbox))
