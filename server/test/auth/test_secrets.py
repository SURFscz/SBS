import base64
from unittest import TestCase

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from server.auth.secrets import secure_hash, generate_token, generate_ldap_password_with_hash, decrypt_secret, \
    encrypt_secret


class TestSecret(TestCase):

    def test_secure_hash(self):
        token = generate_token()
        hashed = secure_hash(token)
        hashed2 = secure_hash(token)
        self.assertEqual(hashed, hashed2)

    def test_ldap_password(self):
        _, password = generate_ldap_password_with_hash()
        self.assertEqual(32, len(password))

    def test_encrypt_decrypt_secret(self):
        encryption_key = base64.b64encode(AESGCM.generate_key(bit_length=256)).decode()
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
