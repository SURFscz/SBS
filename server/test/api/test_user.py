from server.test.abstract_test import AbstractTest


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        response = self.client.get(f"/api/users/me")
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], True)

    def test_me_shib(self):
        response = self.client.get(f"/api/users/me", headers={"Oidc-Claim-Sub": "uid"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], False)
        self.assertEqual(response.json["uid"], "uid")

        # has the user been added to the session
        response = self.client.get(f"/api/users/me")
        self.assertEqual(response.json["guest"], False)

    def test_logout(self):
        response = self.client.get(f"/api/users/me", headers={"Oidc-Claim-Sub": "uid"})
        self.assertEqual(response.json["guest"], False)

        self.client.get(f"/api/users/logout")

        response = self.client.get(f"/api/users/me")
        self.assertEqual(response.json["guest"], True)

    def test_error(self):
        self.client.get(f"/api/users/me", headers={"Oidc-Claim-Sub": "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)
