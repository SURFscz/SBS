# -*- coding: future_fstrings -*-
import unittest

from server.auth.user_claims import add_user_claims
from server.db.domain import User


class TestUserClaims(unittest.TestCase):

    def test_add_user_claims(self):
        user = User()
        add_user_claims({}, "urn:johny", user)
        self.assertEqual("urn:johny", user.name)

    def test_add_user_claims_affiliation(self):
        user = User()
        add_user_claims({"eduperson_scoped_affiliation": ["teacher@sub.uni.org"]}, "urn:johny", user)
        self.assertEqual("uni.org", user.schac_home_organisation)

    def test_add_user_claims_user_name(self):
        user = User()
        add_user_claims({"eduperson_principal_name": "john@example.org"}, "urn:johny", user)
        self.assertEqual("john", user.username)
