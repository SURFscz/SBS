import unittest
import string
import random

from server.auth.user_claims import claim_attribute_hash_headers, claim_attribute_mapping, claim_attribute_hash_user
from server.db.db import User


class TestUserClaims(unittest.TestCase):

    @staticmethod
    def _random_str():
        chars = string.ascii_uppercase + string.digits
        return "".join(random.choice(chars) for x in range(12))

    def test_claim_attribute_hash_headers(self):
        headers = {key: self._random_str() for key in claim_attribute_mapping.keys()}
        hash_headers = claim_attribute_hash_headers(headers)

        user = User()
        for key, attr in claim_attribute_mapping.items():
            setattr(user, attr, headers.get(key))
        hash_user = claim_attribute_hash_user(user)

        self.assertEqual(hash_headers, hash_user)

    def test_claim_attribute_hash_headers_none_value(self):
        headers = {key: None for key in claim_attribute_mapping.keys()}
        hash_headers = claim_attribute_hash_headers(headers)

        user = User()
        for attr in claim_attribute_mapping.values():
            setattr(user, attr, None)
        hash_user = claim_attribute_hash_user(user)

        self.assertEqual(hash_headers, hash_user)
