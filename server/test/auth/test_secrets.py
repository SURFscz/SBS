import base64
import os
from unittest import TestCase

from cryptography.exceptions import InvalidTag

from server.auth.secrets import secure_hash, generate_token, generate_password_with_hash, decrypt_secret, \
    encrypt_secret


class TestSecret(TestCase):

    def test_secure_hash(self):
        token = generate_token()
        hashed = secure_hash(token)
        hashed2 = secure_hash(token)
        self.assertEqual(hashed, hashed2)

    def test_hashed_password_default_rounds(self):
        results = generate_password_with_hash()
        self.assertEqual(60, len(results[0]))
        self.assertEqual(32, len(results[1]))

    def test_hashed_password_limited_rounds(self):
        hashed_password, password = generate_password_with_hash(rounds=5)
        self.assertEqual(60, len(hashed_password))
        self.assertEqual(32, len(password))

    def test_encrypt_decrypt_secret(self):
        encryption_key = base64.b64encode(os.urandom(256 // 8)).decode()
        context = {
            "database_name": "sbs_test",
            "table_name": "services",
            "identifier": 999,
            "scim_url": "https://scim.url"
        }
        plain_secret = "https://top_secret.com?query=params"
        encrypted_value = encrypt_secret(encryption_key, plain_secret, context)

        decrypted_secret = decrypt_secret(encryption_key, encrypted_value, context)
        self.assertEqual(plain_secret, decrypted_secret)

        context["database_name"] = "sbs_evil"
        with self.assertRaisesRegex(InvalidTag, "Invalid value..sbs_test. for database_name, expected sbs_evil"):
            decrypt_secret(encryption_key, encrypted_value, context)
