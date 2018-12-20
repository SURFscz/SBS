from server.test.abstract_test import AbstractTest


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        response = self.client.get("/api/users/me")
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], True)

    def test_me_shib(self):
        response = self.client.get("/api/users/me", headers={"Oidc-Claim-Sub": "uid"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], False)
        self.assertEqual(response.json["uid"], "uid")

        # has the user been added to the session
        response = self.client.get("/api/users/me")
        self.assertEqual(response.json["guest"], False)

    def test_error(self):
        self.client.get("/api/users/me", headers={"Oidc-Claim-Sub": "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)

    def test_users(self):
        users = self.get("/api/users")
        self.assertEqual(1, len(users))
        self.assertEqual("John Doe", users[0]["name"])

    def test_users_new(self):
        user = self.post("/api/users", body={"uid": "uid", "name": "Mary", "email": "Mary@org"})
        print(user)
