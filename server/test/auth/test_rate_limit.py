from server.test.abstract_test import AbstractTest
from server.auth.rate_limit import rate_limit_reached
from server.db.domain import User


class TestRateLimit(AbstractTest):

    def test_rate_limit_reached(self):
        reached = rate_limit_reached(User(id=999))
        self.assertFalse(reached)
