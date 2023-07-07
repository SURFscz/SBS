from unittest import TestCase

from server.auth.secrets import secure_hash, generate_token


class TestSecret(TestCase):

    def test_secure_hash(self):
        token = generate_token()
        hashed = secure_hash(token)
        hashed2 = secure_hash(token)
        self.assertEqual(hashed, hashed2)
