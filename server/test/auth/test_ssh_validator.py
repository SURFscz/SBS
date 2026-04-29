import os
from unittest import TestCase
from unittest.mock import patch

from cryptography.exceptions import UnsupportedAlgorithm

from server.auth.ssh_validator import is_valid_ssh_public_key


class TestSshValidator(TestCase):

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

    def test_invalid_pem_public(self):
        with patch(
                "cryptography.hazmat.primitives.serialization.load_pem_public_key",
                side_effect=UnsupportedAlgorithm("forced")
        ):
            self.validate("valid_pem_public.pub", False)

    def test_valid_pem_public(self):
        self.validate("valid_pem_public.pub", True)

    def test_valid_pkcs1_rsa(self):
        self.validate("valid_pkcs1_rsa.pub", True)

    def test_valid_converted_ssh2(self):
        self.validate("valid_ssh2.pub", True)

    def test_invalid_converted_ssh2(self):
        with patch(
                "cryptography.hazmat.primitives.serialization.load_ssh_public_key",
                side_effect=UnsupportedAlgorithm("forced")
        ):
            self.validate("valid_ssh2.pub", False)

    def test_valid_ssh2(self):
        self.validate("key_rfc4716.pub", True)

    def test_invalid_ssh2(self):
        with patch(
                "cryptography.hazmat.primitives.serialization.load_ssh_public_key",
                side_effect=UnsupportedAlgorithm("forced")
        ):
            self.validate("key_rfc4716.pub", False)

    def test_invalid_base64(self):
        self.validate("invalid_base64.pub", False)

    def test_invalid_format(self):
        self.validate("invalid_format.pub", False)

    def test_empty(self):
        self.validate("empty.pub", False)

    def test_fall_through(self):
        actual = is_valid_ssh_public_key("-------")
        self.assertFalse(actual)

    def test_key_type_with_underscore(self):
        actual = is_valid_ssh_public_key(
            "ssh-ed25519_AAAAC3NzaC1lZDI1NTE5AAAAIB38UxGiQeKnsLY6rRlfwdLfnv+yXWMy4AZ/yKjaRBg+"
            " AAAAC3NzaC1lZDI1NTE5AAAAIB38UxGiQeKnsLY6rRlfwdLfnv+yXWMy4AZ/yKjaRBg+ user@host"
        )
        self.assertTrue(actual)

    def test_key_type_missing_space(self):
        actual = is_valid_ssh_public_key(
            "ssh-ed25519AAAAC3NzaC1lZDI1NTE5AAAAIB38UxGiQeKnsLY6rRlfwdLfnv+yXWMy4AZ/yKjaRBg+"
        )
        self.assertTrue(actual)

    def test_invalid_ssh2_no_aaaa_body(self):
        key = "---- BEGIN SSH2 PUBLIC KEY ----\nno-valid-body-here\n---- END SSH2 PUBLIC KEY ----"
        actual = is_valid_ssh_public_key(key)
        self.assertFalse(actual)

    def test_openssh_key_type_only(self):
        actual = is_valid_ssh_public_key("ssh-rsa")
        self.assertFalse(actual)
