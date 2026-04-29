import os

from server.test.abstract_test import AbstractTest


class TestSsh(AbstractTest):

    def validate(self, file_name, expected):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/../data/keys/{file_name}"
        with open(file) as f:
            key = f.read()
            res = self.post("/api/ssh/validate", body={"ssh": key}, with_basic_auth=False, response_status_code=200)
            self.assertEqual(expected, res["valid"])

    def test_validate_true(self):
        self.validate("valid_openssh_rsa.pub", True)

    def test_validate_false(self):
        self.validate("invalid_base64.pub", False)
