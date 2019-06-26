# -*- coding: future_fstrings -*-
import random
import string

from flask import current_app

from server.auth.user_claims import claim_attribute_hash_headers, claim_attribute_mapping, claim_attribute_hash_user, \
    _get_header_key, get_user_uid, add_user_claims, _get_value
from server.db.db import User
from server.test.abstract_test import AbstractTest


class TestUserClaims(AbstractTest):

    @staticmethod
    def _random_str():
        chars = string.ascii_uppercase + string.digits
        return "".join(random.choice(chars) for x in range(12))

    def test_claim_attribute_hash_headers(self):
        headers = {_get_header_key(key): self._random_str() for key in claim_attribute_mapping.keys()}
        hash_headers = claim_attribute_hash_headers(headers)

        user = User()
        user.uid = get_user_uid(headers)
        add_user_claims(headers, user.uid, user)
        hash_user = claim_attribute_hash_user(user)

        self.assertEqual(hash_headers, hash_user)

    def test_claim_attribute_hash_headers_none_value(self):
        headers = {_get_header_key(key): None for key in claim_attribute_mapping.keys()}
        hash_headers = claim_attribute_hash_headers(headers)

        user = User()
        for attr in claim_attribute_mapping.values():
            setattr(user, attr, None)
        hash_user = claim_attribute_hash_user(user)

        self.assertEqual(hash_headers, hash_user)

    def test_iso_8859_to_utf8_conversion(self):
        res = _get_value({"key": "VeÅ\x99ejnÃ©"}, "key")
        self.assertEqual("Veřejné", res)

    def test_iso_8859_to_utf8_conversion_with_none(self):
        res = _get_value({"key": None}, "key")
        self.assertIsNone(res)

    def test_encoding_bug(self):
        res = _get_value({"key": "Ã«Ã¤Ã¦Å¡"}, "key")
        self.assertEqual("ëäæš", res)

    def test_local_config(self):
        local = current_app.config["LOCAL"]
        current_app.config["LOCAL"] = 1
        res = _get_value({"key": "Ã«Ã¤Ã¦Å¡"}, "key")
        self.assertEqual("Ã«Ã¤Ã¦Å¡", res)
        current_app.config["LOCAL"] = local
