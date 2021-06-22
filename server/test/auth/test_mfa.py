# -*- coding: future_fstrings -*-
import unittest

from jwt import algorithms

from server.auth.mfa import _get_algorithm


class TestSecurity(unittest.TestCase):

    def test_get_algorithm(self):
        self.assertEqual(_get_algorithm({"kty": "rsa"}), algorithms.RSAAlgorithm)
        self.assertEqual(_get_algorithm({"kty": "ec"}), algorithms.ECAlgorithm)
        self.assertEqual(_get_algorithm({"kty": "hmac"}), algorithms.HMACAlgorithm)

        def unsupported_algorithm():
            _get_algorithm({"kty": "nope"})

        self.assertRaises(ValueError, unsupported_algorithm)
