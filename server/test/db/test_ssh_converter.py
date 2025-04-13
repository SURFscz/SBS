import os
from unittest import TestCase

from server.db.ssh_converter import convert_to_open_ssh


class TestSSHConverter(TestCase):

    @staticmethod
    def read_file(file_name):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/../data/{file_name}"
        with open(file) as f:
            return f.read()

    def test_convert_to_open_ssh_pem(self):
        ssh2_pub = self.read_file("pem.pub")
        open_ssh = convert_to_open_ssh(ssh2_pub)
        self.assertTrue(open_ssh.startswith("ssh-rsa AA"))

    def test_convert_to_open_ssh_nope(self):
        open_ssh = convert_to_open_ssh("nope")
        self.assertTrue(open_ssh.startswith("nope"))

    def test_convert_to_open_ssh_pkcs8(self):
        ssh2_pub = self.read_file("pkcs8.pub")
        open_ssh = convert_to_open_ssh(ssh2_pub)
        self.assertTrue(open_ssh.startswith("ssh-rsa AA"))

    def test_convert_to_open_ssh_ssh2(self):
        ssh2_pub = self.read_file("ssh2.pub")
        open_ssh = convert_to_open_ssh(ssh2_pub)
        self.assertTrue(open_ssh.startswith("ssh-rsa AA"))

    def test_convert_to_open_ssh_rfc_4716(self):
        ssh2_pub = self.read_file("rfc_4716.pub")
        open_ssh = convert_to_open_ssh(ssh2_pub)
        self.assertTrue(open_ssh.startswith("ssh-rsa AA"))
