from unittest import TestCase

from server.auth.secrets import secure_hash, generate_token, generate_ldap_password_with_hash


class TestSecret(TestCase):

    def test_secure_hash(self):
        token = generate_token()
        hashed = secure_hash(token)
        hashed2 = secure_hash(token)
        self.assertEqual(hashed, hashed2)

    def test_ldap_password(self):
        _, password = generate_ldap_password_with_hash()
        self.assertEqual(32, len(password))
