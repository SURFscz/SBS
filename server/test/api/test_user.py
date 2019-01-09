from server.api.user import UID_HEADER_NAME
from server.test.abstract_test import AbstractTest


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        response = self.client.get("/api/users/me")
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], True)

    def test_me_shib(self):
        response = self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], False)
        self.assertEqual(response.json["uid"], "uid")

        # has the user been added to the session
        response = self.client.get("/api/users/me")
        self.assertEqual(response.json["guest"], False)

    def test_error(self):
        self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)

    def test_users(self):
        users = self.get("/api/users")
        self.assertEqual(2, len(users))
        john = list(filter(lambda u: u["name"] == "John Doe", users))[0]

        john = self.get(f"/api/users/{john['id']}")
        self.assertEqual("John Doe", john["name"])

        john["email"] = "john@changed.com"
        del john["collaboration_memberships"]
        del john["organisation_memberships"]
        john = self.put("/api/users", john)
        self.assertEqual("john@changed.com", john["email"])

    def test_find_by_uid(self):
        john = self.get("/api/users/find_by_uid/urn:john")
        self.assertEqual("network",
                         john["collaboration_memberships"][0]["user_service_profiles"][0]["service"]["name"])
        self.assertEqual("UUC", john["organisation_memberships"][0]["organisation"]["name"])

    def test_users_404(self):
        self.get("/api/users/999999", response_status_code=404)

    def test_users_new(self):
        user = self.post("/api/users", body={"uid": "uid", "name": "Mary", "email": "Mary@org"})
        self.assertEqual("Mary", user["name"])

    def test_users_new_missing_required(self):
        res = self.post("/api/users", body={"name": "Mary", "email": "Mary@org"}, response_status_code=500)
        self.assertDictEqual({"message": "Missing attributes 'uid' for User"}, res)
