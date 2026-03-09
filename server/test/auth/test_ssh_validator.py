import base64
import os
from unittest import TestCase

from cryptography.exceptions import InvalidTag

from server.auth.secrets import secure_hash, generate_token, generate_password_with_hash, decrypt_secret, \
    encrypt_secret
from server.auth.ssh_validator import is_valid_ssh_public_key


class TestSecret(TestCase):

    def validate(self, file_name, expected):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/../data/keys/{file_name}"
        with open(file) as f:
            key = f.read()
            actual = is_valid_ssh_public_key(key)
            self.assertEqual(expected, actual)

    def test_valid_openssh_rsa(self):
        self.validate("valid_openssh_rsa.pub", True)

    def test_valid_ed25519(self):
        self.validate("valid_ed25519.pub", True)

    def test_valid_ecdsa(self):
        self.validate("valid_ecdsa256.pub", True)

    def test_valid_pem_public(self):
        self.validate("valid_pem_public.pub", True)

    def test_valid_pkcs1_rsa(self):
        self.validate("valid_pkcs1_rsa.pub", True)

    def test_valid_ssh2(self):
        self.validate("valid_ssh2.pub", True)

    def test_invalid_base64(self):
        self.validate("invalid_base64.pub", False)

    def test_invalid_format(self):
        self.validate("invalid_format.pub", False)

    def test_empty(self):
        self.validate("empty.pub", False)
