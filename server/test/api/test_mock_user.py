# -*- coding: future_fstrings -*-
import os
from functools import wraps

from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestMockUser(AbstractTest):

    def allow_for_mock_user_api(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                os.environ["ALLOW_MOCK_USER_API"] = "1"
                fn(*args, **kwargs)
            finally:
                del os.environ["ALLOW_MOCK_USER_API"]

        return wrapper

    def test_login_user_forbidden(self):
        self.put("/api/mock", body={}, with_basic_auth=False, response_status_code=403)

    @allow_for_mock_user_api
    def test_login_user(self):
        self.put("/api/mock", body={"sub": "urn:peter", "name": "Doe Ba", "email": "peter@example.org"},
                 with_basic_auth=False)

        user = self.find_entity_by_name(User, "Doe Ba")
        self.assertEqual("peter@example.org", user.email)

    @allow_for_mock_user_api
    def test_login_new_user(self):
        self.put("/api/mock", body={"sub": "urn:boa", "name": "Boa Dee", "email": "boa@example.org"},
                 with_basic_auth=False)

        user = self.find_entity_by_name(User, "Boa Dee")
        self.assertEqual("boa@example.org", user.email)
