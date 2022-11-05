from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_token


class TestScim(AbstractTest):

    def test_users(self):
        res = self.get("/api/scim/Users", headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(5, len(res))
